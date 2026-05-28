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

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

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

  return cleanedName.length > 28 ? `${cleanedName.slice(0, 28).trim()}...` : cleanedName;
}

function statusClass(status: Receivable["status"]) {
  return `status-chip ${status}`;
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
        receivables: Receivable[];
      }
    >();

    receivables.forEach((receivable) => {
      const key = receivable.branchCode ?? "sem-razao";
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
        throw new Error(data.message ?? "Não foi possível consultar os boletos.");
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
    <>
      <header className="top-app-bar">
        <div className="top-app-inner">
          <span className="brand-title">CIA DO SILK</span>
          <button className="secure-button">Consulta segura</button>
        </div>
      </header>

      <main>
        <section className="hero-shell">
          <div className="hero-content">
            <h1>2ª via de boletos CIA DO SILK</h1>
            <p>Gerencie seus pagamentos de forma rápida e segura.</p>
          </div>
          <div className="hero-glow" />
        </section>

        <section className="floating-search">
          <div className="glass-card">
            <form className="search-form" onSubmit={handleSubmit}>
              <label htmlFor="doc_input">CPF ou CNPJ</label>
              <input
                id="doc_input"
                inputMode="numeric"
                onChange={(event) => setDocument(event.target.value)}
                placeholder="000.000.000-00"
                type="text"
                value={document}
              />
              <button
                className="search-button"
                disabled={isLoading || (normalizedDocument.length !== 11 && normalizedDocument.length !== 14)}
              >
                {isLoading ? (
                  <span className="spinner" />
                ) : (
                  <>
                    <Icon name="search" />
                    Buscar boletos
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        <section className="progress-section">
          <div className="steps">
            <div className="steps-line" />
            <div className="step active">
              <div>1</div>
              <span>Informe documento</span>
            </div>
            <div className={`step ${receivables.length > 0 ? "active" : ""}`}>
              <div>2</div>
              <span>Confira boletos</span>
            </div>
            <div className={`step ${copiedId ? "active" : ""}`}>
              <div>3</div>
              <span>Copie linha</span>
            </div>
          </div>
        </section>

        {error && (
          <section className="section-container">
            <div className="alert-error">{error}</div>
          </section>
        )}

        {!isLoading && !error && receivables.length === 0 && (
          <section className="section-container">
            <div className="empty-state">
              <Icon name="receipt_long" />
              <h2>Pronto para consultar</h2>
              <p>Informe CPF ou CNPJ para localizar boletos em aberto.</p>
            </div>
          </section>
        )}

        {receivables.length > 0 && (
          <section className="section-container results-section">
            <div className="section-title-row">
              <h2>Boletos encontrados</h2>
              <span>{displayedReceivables.length} resultado(s)</span>
            </div>
            <p className="customer-line">
              {receivables[0].customerName} - {receivables[0].document}
            </p>

            {branchGroups.length > 1 && (
              <div className="branch-tabs">
                <button
                  className={selectedBranchKey === "all" ? "active" : ""}
                  onClick={() => setSelectedBranchKey("all")}
                >
                  Todas as razões <span>{receivables.length}</span>
                </button>
                {branchGroups.map((group) => (
                  <button
                    className={selectedBranchKey === group.key ? "active" : ""}
                    key={group.key}
                    onClick={() => setSelectedBranchKey(group.key)}
                  >
                    {group.label} <span>{group.receivables.length}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="boleto-list">
              {displayedReceivables.map((receivable) => (
                <article className="boleto-item" key={receivable.id}>
                  <div className="boleto-header">
                    <div>
                      <p>{shortBranchName(receivable.branchName, "CIA DO SILK")}</p>
                      <h3>Doc: #{receivable.invoiceNumber}</h3>
                      <span>
                        {receivable.branchDocument ? `${receivable.branchDocument}` : "Razão emissora"}
                      </span>
                    </div>
                    <span className={statusClass(receivable.status)}>{statusLabel[receivable.status]}</span>
                  </div>

                  <div className="boleto-details">
                    <div>
                      <p>Vencimento</p>
                      <strong>{formatDate(receivable.dueDate)}</strong>
                    </div>
                    <div>
                      <p>Valor</p>
                      <strong>{formatCurrency(receivable.amount)}</strong>
                    </div>
                  </div>

                  {receivable.lineDigitavel && (
                    <div className="line-code">
                      <span>Linha digitável</span>
                      <code>{receivable.lineDigitavel}</code>
                    </div>
                  )}

                  <div className="boleto-actions">
                    <button onClick={() => copyLine(receivable)}>
                      <Icon name={copiedId === receivable.id ? "check" : "content_copy"} />
                      {copiedId === receivable.id ? "Copiado!" : "Copiar Linha"}
                    </button>
                    <button
                      className="pdf-button"
                      disabled={!receivable.boletoUrl && !receivable.pdfBase64}
                      onClick={() => openBoleto(receivable)}
                      title="Abrir PDF"
                    >
                      <Icon name="picture_as_pdf" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="section-container help-section" id="ajuda">
          <div className="help-card">
            <div className="help-icon">
              <Icon name="support_agent" />
            </div>
            <div>
              <h4>Precisa de ajuda?</h4>
              <p>Nossa equipe de suporte financeiro está pronta para te atender via WhatsApp.</p>
            </div>
            {whatsappUrl ? (
              <a className="whatsapp-link" href={whatsappUrl} rel="noreferrer" target="_blank">
                Falar no WhatsApp
              </a>
            ) : (
              <button className="whatsapp-link" disabled>
                WhatsApp em configuração
              </button>
            )}
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>CIA DO SILK</span>
        <p>© 2026 CIA DO SILK - Todos os direitos reservados.</p>
        <div>
          <a href="#consulta">Boletos</a>
          <a href="#ajuda">Ajuda</a>
        </div>
      </footer>

      <nav className="bottom-nav">
        <a href="#">
          <Icon name="home" />
          <span>Início</span>
        </a>
        <a className="active" href="#consulta">
          <Icon name="receipt_long" />
          <span>Boletos</span>
        </a>
        <a href="#ajuda">
          <Icon name="support_agent" />
          <span>Suporte</span>
        </a>
      </nav>
    </>
  );
}
