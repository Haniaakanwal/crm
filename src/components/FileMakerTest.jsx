import { useState } from 'react';
import { createSession, callScript, deleteSession } from '../services/fileMakerService';

function FileMakerTest() {
  const [steps, setSteps] = useState({
    session: { status: 'idle', detail: '' },
    script: { status: 'idle', detail: '' },
    logout: { status: 'idle', detail: '' },
  });

  const updateStep = (key, status, detail = '') => {
    setSteps((prev) => ({ ...prev, [key]: { status, detail } }));
  };

  const handleTest = async () => {
    setSteps({
      session: { status: 'pending', detail: '' },
      script: { status: 'idle', detail: '' },
      logout: { status: 'idle', detail: '' },
    });

    let token;

    // Step 1: create session
    try {
      token = await createSession();
      updateStep('session', 'success', `Token received: ${token.slice(0, 12)}…`);
    } catch (err) {
      updateStep('session', 'fail', err.message);
      return; // nothing else can run without a token
    }

    // Step 2: call script
    updateStep('script', 'pending');
    try {
      const scriptResult = await callScript(token, { test: true });
      updateStep('script', 'success', JSON.stringify(scriptResult));
    } catch (err) {
      updateStep('script', 'fail', err.message);
      // fall through to step 3 so the session still gets cleaned up
    }

    // Step 3: delete session
    updateStep('logout', 'pending');
    try {
      await deleteSession(token);
      updateStep('logout', 'success', 'Session closed');
    } catch (err) {
      updateStep('logout', 'fail', err.message);
    }
  };

  const renderStep = (label, key) => {
    const { status, detail } = steps[key];
    const color =
      status === 'success' ? '#34D399' :
      status === 'fail' ? '#F87171' :
      status === 'pending' ? '#F5B84E' : '#7A8BAD';
    const icon =
      status === 'success' ? '✓' :
      status === 'fail' ? '✗' :
      status === 'pending' ? '…' : '○';

    return (
      <div style={{ marginBottom: 10 }}>
        <strong style={{ color }}>{icon} {label}</strong>
        {detail && (
          <div style={{ fontSize: 12, marginTop: 4, marginLeft: 20, wordBreak: 'break-all', color: '#7A8BAD' }}>
            {detail}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: 24, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, maxWidth: 480 }}>
      <button onClick={handleTest}>Run 3-step test</button>
      <div style={{ marginTop: 16 }}>
        {renderStep('1. Create session', 'session')}
        {renderStep('2. Call script', 'script')}
        {renderStep('3. Delete session', 'logout')}
      </div>
    </div>
  );
}

export default FileMakerTest;
