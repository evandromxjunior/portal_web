import { FormEvent, useMemo, useState } from "react";

type Receivable = {
  id: string;
  customerCode?: string;
  customerName: string;
  document: string;
  branchCode?: string | null;
  branchName?: string | null;
  branchDocument?: string | null;
  invoiceNumber: string;
  installment?: string;
  dueDate: string;
  amount: number;
  status: "open" | "overdue" | "paid";
  lineDigitavel?: string | null;
  boletoUrl?: string | null;
  pdfBase64?: string | null;
};

const statusLabel: Record<Receivable["status"], string> = {
  open: "Em aberto",
  overdue: "Vencido",
  paid: "Pago"
};

const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER?.replace(/\D/g, "") ?? "";
const whatsappMessage = encodeURIComponent(
  "Olá, sou cliente da CIA DO SILK e preciso de atendimento financeiro sobre boletos."
);
const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${whatsappMessage}` : null;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function openPdfBase64(pdfBase64: string) {
  const byteCharacters = atob(pdfBase64);
  const byteNumbers = Array.from(byteCharacters, (character) => character.charCodeAt(0));
  const blob = new Blob([new Uint8Array(byteNumbers)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
}

function shortBranchName(branchName?: string | null, fallback = "CIA DO SILK") {
  if (!branchName) {
    return fallback;
  }

  const cleanedName = branchName
    .replace(/\s+(LTDA|EIRELI|S\/A|SA|ME|EPP)$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleanedName.length > 26 ? `${cleanedName.slice(0, 26).trim()}...` : cleanedName;
}

export default function App() {
  const [document, setDocument] = useState("");
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedBranchKey, setSelectedBranchKey] = useState("all");
  const normalizedDocument = useMemo(() => onlyDigits(document), [document]);
  const branchGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        label: string;
        document?: string | null;
        receivables: Receivable[];
      }
    >();

    receivables.forEach((receivable) => {
      const key = receivable.branchCode ?? "sem-filial";
      const label = receivable.branchName
        ? shortBranchName(receivable.branchName)
        : receivable.branchCode
          ? `Razão ${receivable.branchCode}`
          : "Razão não informada";
      const currentGroup = groups.get(key);

      if (currentGroup) {
        currentGroup.receivables.push(receivable);
        return;
      }

      groups.set(key, {
        key,
        label,
        document: receivable.branchDocument,
        receivables: [receivable]
      });
    });

    return [...groups.values()];
  }, [receivables]);
  const displayedReceivables = useMemo(() => {
    if (selectedBranchKey === "all") {
      return receivables;
    }

    return branchGroups.find((group) => group.key === selectedBranchKey)?.receivables ?? [];
  }, [branchGroups, receivables, selectedBranchKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setReceivables([]);
    setCopiedId(null);
    setSelectedBranchKey("all");

    try {
      const response = await fetch(`/api/receivables?document=${normalizedDocument}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Nao foi possivel consultar os boletos.");
      }

      setReceivables(data.receivables ?? []);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro inesperado.");
    } finally {
      setIsLoading(false);
    }
  }

  async function copyLine(receivable: Receivable) {
    if (!receivable.lineDigitavel) {
      return;
    }

    await navigator.clipboard.writeText(receivable.lineDigitavel);
    setCopiedId(receivable.id);
  }

  function openBoleto(receivable: Receivable) {
    if (receivable.boletoUrl) {
      window.open(receivable.boletoUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (receivable.pdfBase64) {
      openPdfBase64(receivable.pdfBase64);
    }
  }

  return (
    <main className="page">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">CS</div>
          <div>
            <strong>CIA DO SILK</strong>
            <span>Portal financeiro</span>
          </div>
        </div>
        <div className="secure-badge">Consulta segura</div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Atendimento financeiro</span>
          <h1>2ª via de boletos CIA DO SILK</h1>
          <p>
            Consulte seus títulos em aberto de forma rápida, copie a linha digitável e
            mantenha seus pagamentos em dia.
          </p>
          <div className="hero-actions">
            <a href="#consulta">Consultar boletos</a>
            <a className="ghost" href={whatsappUrl ?? "#atendimento"}>
              Falar com financeiro
            </a>
          </div>
        </div>
        <div className="hero-panel">
          <span>Disponível agora</span>
          <strong>Boletos em aberto</strong>
          <p>Dados consultados diretamente no financeiro da CIA DO SILK.</p>
        </div>
      </section>

      <section className="support-grid" id="consulta">
        <section className="card search-card">
          <form onSubmit={handleSubmit}>
            <div className="form-heading">
              <div>
                <span className="eyebrow dark">Acesse seu boleto</span>
                <label htmlFor="document">Informe CPF ou CNPJ</label>
              </div>
              <span className="hint">Somente números também funcionam</span>
            </div>
            <div className="search-row">
              <input
                id="document"
                value={document}
                onChange={(event) => setDocument(event.target.value)}
                placeholder="Ex.: 12.345.678/0001-95"
                inputMode="numeric"
              />
              <button disabled={isLoading || (normalizedDocument.length !== 11 && normalizedDocument.length !== 14)}>
                {isLoading ? "Consultando..." : "Buscar boletos"}
              </button>
            </div>
            <small>Os dados são usados apenas para localizar seus títulos em aberto.</small>
          </form>
        </section>

        <aside className="card whatsapp-card" id="atendimento">
          <div className="whatsapp-mark">WA</div>
          <span className="eyebrow dark">Atendimento financeiro</span>
          <h2>Precisa de ajuda?</h2>
          <p>
            Fale com a equipe da CIA DO SILK para dúvidas sobre boletos, vencimentos,
            pagamentos ou baixa de títulos.
          </p>
          {whatsappUrl ? (
            <a className="whatsapp-button" href={whatsappUrl} rel="noreferrer" target="_blank">
              Entrar em contato via WhatsApp
            </a>
          ) : (
            <button className="whatsapp-button" disabled>
              WhatsApp em configuração
            </button>
          )}
        </aside>
      </section>

      <section className="info-strip">
        <div>
          <strong>1</strong>
          <span>Informe seu documento</span>
        </div>
        <div>
          <strong>2</strong>
          <span>Confira os boletos encontrados</span>
        </div>
        <div>
          <strong>3</strong>
          <span>Copie a linha digitável</span>
        </div>
      </section>

      {error && <div className="alert error">{error}</div>}

      {!isLoading && !error && receivables.length === 0 && (
        <section className="empty-state">
          <h2>Pronto para consultar</h2>
          <p>Informe o CPF ou CNPJ para localizar boletos em aberto na CIA DO SILK.</p>
        </section>
      )}

      {receivables.length > 0 && (
        <section className="results">
          <div className="results-header">
            <div>
              <h2>Boletos encontrados</h2>
              <p>
                {receivables[0].customerName} - {receivables[0].document}
              </p>
            </div>
            <strong>{displayedReceivables.length} de {receivables.length} título(s)</strong>
          </div>

          {branchGroups.length > 1 && (
            <div className="branch-filter">
              <button
                className={selectedBranchKey === "all" ? "active" : ""}
                onClick={() => setSelectedBranchKey("all")}
              >
                Todas as razões
                <span>{receivables.length}</span>
              </button>
              {branchGroups.map((group) => (
                <button
                  className={selectedBranchKey === group.key ? "active" : ""}
                  key={group.key}
                  onClick={() => setSelectedBranchKey(group.key)}
                >
                  {group.label}
                  <span>{group.receivables.length}</span>
                </button>
              ))}
            </div>
          )}

          <div className="grid">
            {displayedReceivables.map((receivable) => (
              <article className="card boleto-card" key={receivable.id}>
                <div className="ticket-ribbon">{shortBranchName(receivable.branchName)}</div>
                <div className="boleto-header">
                  <div>
                    <span className="muted">Documento</span>
                    <h3>{receivable.invoiceNumber}</h3>
                    <p className="branch-line">
                      {receivable.branchName ?? "Razão não informada"}
                      {receivable.branchDocument ? ` - ${receivable.branchDocument}` : ""}
                    </p>
                  </div>
                  <span className={`status ${receivable.status}`}>{statusLabel[receivable.status]}</span>
                </div>

                <dl>
                  <div>
                    <dt>Parcela</dt>
                    <dd>{receivable.installment ?? "-"}</dd>
                  </div>
                  <div>
                    <dt>Vencimento</dt>
                    <dd>{formatDate(receivable.dueDate)}</dd>
                  </div>
                  <div>
                    <dt>Valor</dt>
                    <dd>{formatCurrency(receivable.amount)}</dd>
                  </div>
                </dl>

                {receivable.lineDigitavel && (
                  <div className="line-box">
                    <span>Linha digitável</span>
                    <code>{receivable.lineDigitavel}</code>
                  </div>
                )}

                <div className="actions">
                  <button
                    className="secondary"
                    disabled={!receivable.lineDigitavel}
                    onClick={() => copyLine(receivable)}
                  >
                    {copiedId === receivable.id ? "Copiado" : "Copiar linha"}
                  </button>
                  <button
                    disabled={!receivable.boletoUrl && !receivable.pdfBase64}
                    onClick={() => openBoleto(receivable)}
                  >
                    Abrir PDF
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
