const payload = $input.first().json.body.payload;

// Format individual open tickets
const ticketsList = payload.tickets.map(t => {
  return `- *[${t.priority.toUpperCase()}]* #${t.id}: _${t.title}_ (Status: \`${t.status}\`)`;
}).join('\n');

// Format status breakdown
const breakdown = Object.entries(payload.statusCounts)
  .map(([status, count]) => `  - *${status}*: ${count}`)
  .join('\n');

const text = `📊 *Daily Ticket Summary Digest*\n\n` +
             `*Total Open Tickets:* ${payload.totalOpenTickets}\n` +
             `*Status Breakdown:*\n${breakdown}\n\n` +
             `*Open Tickets List:*\n${ticketsList || '_No open tickets found._'}`;
             
return { json: { text } };
