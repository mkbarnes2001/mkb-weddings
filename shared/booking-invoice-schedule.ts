const dateOffset = (date: string, days: number) =>
  new Date(Date.parse(date + "T12:00:00Z") + days * 86400000)
    .toISOString()
    .slice(0, 10);
export function bookingInvoiceSchedule(
  service: any,
  amount: number,
  dueNow: number,
  today: string,
  eventDate: string,
) {
  const p = service.payment === "schedule" ? service.schedule : null;
  if (p) {
    const deposit =
      p.depositType === "fixed"
        ? Math.min(amount, p.depositValue)
        : p.depositType === "percentage"
          ? Math.ceil((amount * p.depositValue) / 100)
          : 0;
    const items = [];
    if (deposit > 0)
      items.push({
        suffix: dueNow ? "_due" : "_deposit",
        type: "deposit",
        label: dueNow ? "Due at booking" : "Deposit",
        amount: deposit,
        date: dateOffset(today, p.depositDueDaysAfterAcceptance),
      });
    if (amount > deposit)
      items.push({
        suffix: "_balance",
        type: "final",
        label: "Remaining balance",
        amount: amount - deposit,
        date: dateOffset(eventDate, -p.finalBalanceDueDaysBeforeEvent),
      });
    for (const item of items) if (item.date < today) item.date = today;
    return items;
  }
  if (!dueNow)
    return [
      {
        suffix: "_balance",
        type: "final",
        label: "Payment due",
        amount,
        date: eventDate,
      },
    ];
  return [
    {
      suffix: "_due",
      type: "deposit",
      label: "Due at booking",
      amount: dueNow,
      date: today,
    },
    ...(amount > dueNow
      ? [
          {
            suffix: "_balance",
            type: "final",
            label: "Remaining balance",
            amount: amount - dueNow,
            date: eventDate,
          },
        ]
      : []),
  ];
}
