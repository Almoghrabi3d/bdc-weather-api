const $ = (s) => document.querySelector(s);

function statusClass(code) {
  if (code >= 500) return 'status-5xx';
  if (code >= 400) return 'status-4xx';
  return 'status-2xx';
}

async function loadLogs() {
  const key = $('#apiKey').value.trim();
  if (!key) return; // لا نطلب بدون مفتاح

  const params = new URLSearchParams({ limit: '100' });
  const res = await fetch(`/api/logs?${params.toString()}`, {
    headers: { 'x-api-key': key }
  });

  const tbody = $('#logsTable tbody');
  tbody.innerHTML = '';

  if (!res.ok) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6">Error: ${res.status} — check x-api-key</td>`;
    tbody.appendChild(tr);
    return;
  }

  const logs = await res.json();
  const methodFilter = $('#method').value;
  const statusFilter = $('#status').value;

  logs
    .filter((l) => !methodFilter || l.method === methodFilter)
    .filter((l) => {
      if (!statusFilter) return true;
      const c = Number(l.status);
      if (statusFilter === '2xx') return c >= 200 && c < 300;
      if (statusFilter === '4xx') return c >= 400 && c < 500;
      if (statusFilter === '5xx') return c >= 500;
      return true;
    })
    .forEach((log) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${new Date(log.timestamp).toLocaleString()}</td>
        <td><span class="pill">${log.method}</span></td>
        <td>${log.endpoint}</td>
        <td>${log.ip}</td>
        <td class="${statusClass(Number(log.status))}">${log.status}</td>
        <td title="${log.userAgent || ''}">${(log.userAgent || '').slice(0, 60)}${(log.userAgent || '').length > 60 ? '…' : ''}</td>
      `;
      tbody.appendChild(tr);
    });
}

$('#refresh').addEventListener('click', loadLogs);
setInterval(loadLogs, 5000);
