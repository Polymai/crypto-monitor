const CSV_COLUMNS = [
  "captured_at",
  "buy_exchange",
  "sell_exchange",
  "pair",
  "buy_price",
  "sell_price",
  "gross_spread_pct",
  "net_profit_usd",
  "net_profit_pct",
  "signal",
];

export function createHistoryCsv(history) {
  const rows = history.map((item) => [
    item.capturedAt,
    item.buyExchange,
    item.sellExchange,
    item.pair,
    item.buyPrice,
    item.sellPrice,
    item.grossSpreadPct,
    item.netProfitUsd,
    item.netProfitPct,
    item.signal,
  ]);

  return [CSV_COLUMNS, ...rows]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\n");
}

export function downloadHistoryCsv(history) {
  const csv = createHistoryCsv(history);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const filename = `crypto-monitor-history-${new Date().toISOString().slice(0, 10)}.csv`;
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return filename;
}

function formatCsvCell(value) {
  const text = value == null ? "" : String(value);
  if (/["\n,]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}
