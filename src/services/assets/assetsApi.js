import { createSession, deleteSession, safeJson } from '../fileMakerService';

export const FM_BASE = '/fmapi/fmi/data/v1/databases/Practice';

// ── FETCH ALL ASSETS FOR ADMIN REGISTRY ──────────────────────────────────────
export async function getAllAssetsRegistry() {
  const token = await createSession();
  try {
    const url = `${FM_BASE}/layouts/Assets/records?_limit=500`;
    const res  = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
    const data = await safeJson(res);
    if (!res.ok) return [];

    return (data?.response?.data || []).map(r => {
      const f = r.fieldData;
      return {
        recordId:        r.recordId,
        assetId:         f.AssetID,
        assetCode:       f.AssetCode    || '—',
        category:        f.Category     || '—',
        brand:           f.Brand        || '—',
        model:           f.Model        || '—',
        condition:       f.Condition    || 'Good',
        status:          f.Status       || 'Available',
        currentHolder:   f.CurrentHolder   || 'Unassigned',
        currentHolderId: f.CurrentHolderID || null,
        notes:           f.Notes        || ''
      };
    });
  } finally {
    await deleteSession(token);
  }
}

// ── CREATE NEW ASSET ──────────────────────────────────────────────────────────
export async function createNewAssetInFM(assetPayload) {
  const token = await createSession();
  try {
    const url = `${FM_BASE}/layouts/Assets/records`;
    const res  = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        fieldData: {
          AssetCode:     assetPayload.assetCode,
          Category:      assetPayload.category,
          Brand:         assetPayload.brand,
          Model:         assetPayload.model,
          Condition:     assetPayload.condition,
          Status:        'Available',
          CurrentHolder: 'Unassigned'
        }
      })
    });
    return res.ok;
  } finally {
    await deleteSession(token);
  }
}

// ── ASSIGN ASSET TO EMPLOYEE ──────────────────────────────────────────────────
export async function assignAssetToEmployeeInFM(assetRecordId, employeeId, employeeName) {
  const token = await createSession();
  try {
    const d             = new Date();
    const formattedDate = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;

    // 1. Log entry in AssetsAssignments
    const assignUrl = `${FM_BASE}/layouts/AssetsAssignments/records`;
    await fetch(assignUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        fieldData: {
          _fk_AssetID:    Number(assetRecordId),
          _fk_EmployeeID: Number(employeeId),
          AssignedDate:   formattedDate,
          AssignedBy:     'Admin',
          ConditionOut:   'Good'
        }
      })
    });

    // 2. Patch status onto parent Assets record
    const assetUrl = `${FM_BASE}/layouts/Assets/records/${assetRecordId}`;
    const patchRes = await fetch(assetUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        fieldData: {
          Status:          'Assigned',
          CurrentHolder:   employeeName,
          CurrentHolderID: Number(employeeId)
        }
      })
    });
    return patchRes.ok;
  } finally {
    await deleteSession(token);
  }
}

// ── FETCH ASSETS ASSIGNED TO AN EMPLOYEE ─────────────────────────────────────
export async function getEmployeeAssignedAssets(employeeId) {
  if (!employeeId) {
    console.warn('⚠️ No employee ID provided for asset lookup.');
    return [];
  }

  const token = await createSession();
  try {
    // 1. Find assignment records for this employee
    //    _fk_EmployeeID is a Number field — use plain string value, not == operator
    const assignUrl = `${FM_BASE}/layouts/AssetsAssignments/_find`;
    const assignRes = await fetch(assignUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        query: [{ _fk_EmployeeID: String(Number(employeeId)) }]
      })
    });

    const assignData = await safeJson(assignRes);

    if (!assignRes.ok) {
      // FM 404 + code "401" = no records found — not a real error
      const errorCode = assignData?.messages?.[0]?.code;
      if (errorCode === '401' || errorCode === 401) return [];
      console.error('AssetsAssignments _find failed:', assignData);
      return [];
    }

    const assignments = assignData?.response?.data || [];
    if (assignments.length === 0) return [];

    // ── DEBUG: log raw assignment data so we can see what _fk_AssetID holds ──
    console.log('[Assets] raw assignments:', assignments.map(a => ({
      assignRecordId: a.recordId,
      fk_AssetID:     a.fieldData._fk_AssetID,
      fk_EmployeeID:  a.fieldData._fk_EmployeeID,
    })));

    // 2. Pull the full asset registry
    const assetsUrl = `${FM_BASE}/layouts/Assets/records?_limit=500`;
    const assetsRes = await fetch(assetsUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });

    const assetsData = await safeJson(assetsRes);
    const mainRegistry = assetsData?.response?.data || [];

    // ── DEBUG: log registry so we can see recordId vs AssetID values ──
    console.log('[Assets] registry sample (first 5):', mainRegistry.slice(0, 5).map(r => ({
      recordId:  r.recordId,
      AssetID:   r.fieldData.AssetID,
      AssetCode: r.fieldData.AssetCode,
      Brand:     r.fieldData.Brand,
      Model:     r.fieldData.Model,
    })));

    // 3. Stitch — try matching _fk_AssetID against BOTH recordId AND AssetID field
    //    whichever one was used when the assignment was created
    return assignments.map(a => {
      const af       = a.fieldData;
      const targetId = Number(af._fk_AssetID);

      const matched =
        mainRegistry.find(item => Number(item.recordId)            === targetId) ||
        mainRegistry.find(item => Number(item.fieldData.AssetID)   === targetId);

      console.log(`[Assets] _fk_AssetID=${targetId} → matched:`, matched ? matched.fieldData.AssetCode : 'NONE');

      const mf = matched ? matched.fieldData : {};

      return {
        id:           a.recordId,
        code:         mf.AssetCode || `ASSET-${targetId}`,
        category:     mf.Category  || 'Equipment',
        brand:        mf.Brand     || '—',
        model:        mf.Model     || '—',
        brandModel:   mf.Brand && mf.Model
                        ? `${mf.Brand} ${mf.Model}`
                        : mf.Model || mf.Brand || 'Company Hardware',
        condition:    af.ConditionOut || mf.Condition || 'Good',
        assignedDate: af.AssignedDate || ''
      };
    });

  } catch (error) {
    console.error('❌ getEmployeeAssignedAssets failed:', error);
    return [];
  } finally {
    await deleteSession(token);
  }
}

// ── RETURN ASSET ──────────────────────────────────────────────────────────────
export async function returnAssetFromEmployeeInFM(assetRecordId) {
  const token = await createSession();
  try {
    const assetUrl = `${FM_BASE}/layouts/Assets/records/${assetRecordId}`;
    const patchRes = await fetch(assetUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        fieldData: {
          Status:          'Available',
          CurrentHolder:   'Unassigned',
          CurrentHolderID: ''
        }
      })
    });
    return patchRes.ok;
  } finally {
    await deleteSession(token);
  }
}