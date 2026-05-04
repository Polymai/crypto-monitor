const DEFAULT_COSTS = {
  tradeFeeRate: 0.0012,
  slippageRate: 0.0008,
  transferFeeRate: 0.00015,
  networkFeeUsd: 8.5,
  actionThresholdUsd: 25,
};

export function calculateArbitrageOpportunities(prices, costs = DEFAULT_COSTS) {
  if (!Array.isArray(prices) || prices.length < 2) {
    return [];
  }

  const opportunities = [];

  prices.forEach((buyExchange) => {
    prices.forEach((sellExchange) => {
      if (buyExchange.id === sellExchange.id) {
        return;
      }

      const buyPrice = buyExchange.ask;
      const sellPrice = sellExchange.bid;
      const grossSpreadUsd = sellPrice - buyPrice;
      const tradingCostUsd = buyPrice * costs.tradeFeeRate + sellPrice * costs.tradeFeeRate;
      const slippageCostUsd = (buyPrice + sellPrice) * costs.slippageRate;
      const transferCostUsd = buyPrice * costs.transferFeeRate + costs.networkFeeUsd;
      const totalCostUsd = tradingCostUsd + slippageCostUsd + transferCostUsd;
      const netProfitUsd = grossSpreadUsd - totalCostUsd;
      const grossSpreadPct = (grossSpreadUsd / buyPrice) * 100;
      const netProfitPct = (netProfitUsd / buyPrice) * 100;
      const signal = getSignal(netProfitUsd, costs.actionThresholdUsd);

      opportunities.push({
        id: `${buyExchange.id}-${sellExchange.id}`,
        buyExchange,
        sellExchange,
        buyPrice,
        sellPrice,
        grossSpreadUsd,
        grossSpreadPct,
        totalCostUsd,
        netProfitUsd,
        netProfitPct,
        signal,
      });
    });
  });

  return opportunities.sort((left, right) => right.netProfitUsd - left.netProfitUsd);
}

function getSignal(netProfitUsd, actionThresholdUsd) {
  if (netProfitUsd >= actionThresholdUsd) {
    return {
      key: "actionable",
      label: "Actionable",
    };
  }

  if (netProfitUsd > 0) {
    return {
      key: "watch",
      label: "Watch",
    };
  }

  return {
    key: "no-trade",
    label: "No trade",
  };
}
