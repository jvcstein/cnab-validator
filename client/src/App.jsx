import React, { useRef, useState, useMemo } from 'react';

const FIELD_LABELS = {
  nossoNumero: 'Nosso número',
  seuNumero: 'Seu número',
  sacadoNome: 'Nome do sacado',
  sacadoDoc: 'CNPJ do sacado',
  sacadoTelefone: 'Telefone do sacado',
  chaveNota: 'Chave da nota',
  sacadoEndereco: 'Endereço do sacado'
};
const COLUMNS = Object.keys(FIELD_LABELS);

export default function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState('error');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const pick = (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError('');
  };

  const validate = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const resp = await fetch('/api/validate', { method: 'POST', body });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Erro ao validar o arquivo.');
      setResult(data);
      setTab(data.summary.invalid > 0 ? 'error' : 'ok');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const rows = useMemo(
    () => (result ? result.records.filter((r) => r.status === tab) : []),
    [result, tab]
  );

  return (
    <div className="page">
      <header>
        <h1>Validador de arquivo CNAB</h1>
        <p>Envie o arquivo de remessa (.txt, layout 400/444) para conferir os dados dos sacados e títulos antes do envio.</p>
      </header>

      <section
        className={`dropzone ${dragging ? 'drag' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".txt,.rem,.cnab" hidden onChange={(e) => pick(e.target.files[0])} />
        {file ? (
          <p><strong>{file.name}</strong> <span className="muted">({(file.size / 1024).toFixed(1)} KB)</span></p>
        ) : (
          <p>Arraste o arquivo aqui ou <u>clique para selecionar</u></p>
        )}
      </section>

      <div className="actions">
        <button className="primary" disabled={!file || loading} onClick={validate}>
          {loading ? 'Validando…' : 'Validar arquivo'}
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      {result && (
        <>
          {result.fileErrors.length > 0 && (
            <div className="alert error">
              <strong>Problemas na estrutura do arquivo</strong>
              <ul>
                {result.fileErrors.map((e, i) => (
                  <li key={i}>
                    {e.message}
                    <div className="hint">💡 {e.suggestion}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="summary">
            <div className="card"><span>{result.summary.total}</span>Registros</div>
            <div className="card ok"><span>{result.summary.valid}</span>Corretos</div>
            <div className="card bad"><span>{result.summary.invalid}</span>Com erro</div>
          </div>

          <div className="tabs">
            <button className={tab === 'error' ? 'active' : ''} onClick={() => setTab('error')}>
              Com erro ({result.summary.invalid})
            </button>
            <button className={tab === 'ok' ? 'active' : ''} onClick={() => setTab('ok')}>
              Corretos ({result.summary.valid})
            </button>
          </div>

          {rows.length === 0 ? (
            <p className="muted empty">
              {tab === 'error' ? 'Nenhum registro com erro. 🎉' : 'Nenhum registro correto.'}
            </p>
          ) : (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Linha</th>
                    {COLUMNS.map((c) => <th key={c}>{FIELD_LABELS[c]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const errByField = {};
                    r.errors.forEach((e) => { (errByField[e.field] ||= []).push(e); });
                    return (
                      <React.Fragment key={r.line}>
                        <tr>
                          <td>{r.line}</td>
                          {COLUMNS.map((c) => (
                            <td key={c} className={errByField[c] ? 'cellError' : ''}>
                              {r[c] || <em className="muted">vazio</em>}
                            </td>
                          ))}
                        </tr>
                        {r.errors.length > 0 && (
                          <tr className="detail">
                            <td colSpan={COLUMNS.length + 1}>
                              <ul>
                                {r.errors.map((e, i) => (
                                  <li key={i}>
                                    <span className="badge">{FIELD_LABELS[e.field] || e.field}</span> {e.message}
                                    <div className="hint">💡 Como ajustar: {e.suggestion}</div>
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
