// public/dashboard.js
const $ = (s) => document.querySelector(s);

function statusClass(code) {
  if (code >= 500) return 'status-5xx';
  if (code >= 400) return 'status-4xx';
  return 'status-2xx';
}

function buildParams() {
  const p = new URLSearchParams();
  p.set('page', $('#page').value || '1');
  p.set('limit', $('#limit').value || '20');
  if ($('#method').value) p.set('method', $('#method').value);
  if ($('#status').value) p.set('statusClass', $('#status').value);
  if ($('#endpointContains').value) p.set('endpointContains', $('#endpointContains').value);
  p.set('sortBy', $('#sortBy').value || 'timestamp');
  p.set('sortDir', $('#sortDir').value || 'desc');
  return p;
}

async function loadLogs() {
  const key = $('#apiKey').value.trim();
  if (!key) return;

  const params = buildParams();
  const res = await fetch(`/api/logs?${params.toString()}`, {
    headers: { 'x-api-key': key }
  });

  const tbody = $('#logsTable tbody');
  tbody.innerHTML = '';

  if (!res.ok) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6">Error ${res.status} — check x-api-key</td>`;
    tbody.appendChild(tr);
    return;
  }

  const data = await res.json();
  const { items, page } = data;

  if (!items.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6">No logs match your filters.</td>`;
    tbody.appendChild(tr);
  } else {
    items.forEach((log) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${new Date(log.timestamp).toLocaleString()}</td>
        <td><span class="pill">${log.method || ''}</span></td>
        <td>${log.endpoint || ''}</td>
        <td>${log.ip || ''}</td>
        <td class="${statusClass(Number(log.status || 200))}">${log.status || 200}</td>
        <td title="${log.userAgent || ''}">${(log.userAgent || '').slice(0, 60)}${(log.userAgent || '').length > 60 ? '…' : ''}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // حدّث الصفحة المعروضة
  $('#page').value = page;
}

$('#refresh').addEventListener('click', loadLogs);

// أي تغيير يعيد التحميل
['method','status','limit','sortBy','sortDir','endpointContains']
  .forEach(id => $(`#${id}`).addEventListener('change', loadLogs));

// تحديث كل 5 ثواني
setInterval(loadLogs, 5000);
