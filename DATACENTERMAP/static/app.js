let servers = [];

const render = () => {
  const map = document.getElementById('map');
  const searchTerm = document.getElementById('searchBox')?.value?.toLowerCase() || '';
  const filterStatus = document.getElementById('statusFilter')?.value || '';

  map.innerHTML = '';
  const grouped = {};

  servers.forEach(server => {
    if (
      (server.name.toLowerCase().includes(searchTerm) || server.ip.includes(searchTerm)) &&
      (filterStatus === '' || server.status === filterStatus)
    ) {
      const key = 'Rack ' + server.rack;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(server);
    }
  });

  for (const rack in grouped) {
    const rackNum = grouped[rack][0].rack;
    const col = document.createElement('div');
    col.className = 'col-md-3';

    const rackDiv = document.createElement('div');
    rackDiv.className = 'rack';
    rackDiv.innerHTML = `<strong>${rack}</strong>`;

    if (isAdmin) {
      rackDiv.onclick = () => {
        showAddForm(rackNum);
      };
    }

    grouped[rack].forEach(srv => {
      const srvDiv = document.createElement('div');
      srvDiv.className = 'server';
      if (srv.status === 'Down') srvDiv.classList.add('down');
      else if (srv.status === 'Maintenance') srvDiv.classList.add('maintenance');
      srvDiv.innerText = srv.name;

      srvDiv.onclick = (e) => {
        e.stopPropagation();
        const info = document.getElementById('info');
        const panel = document.getElementById('adminPanel');

        panel.innerHTML = '';

        if (
          info.innerHTML.includes(`value="${srv.name}"`) &&
          info.innerHTML.includes(`value="${srv.ip}"`)
        ) {
          info.innerHTML = '';
          return;
        }

        let buttons = '';
        if (isAdmin) {
          buttons = `
            <div class='mt-2'>
              <button class="btn btn-success me-2" onclick="saveServer('${srv.ip}')">Save</button>
              <button class="btn btn-outline-danger" onclick="deleteServer('${srv.ip}')">Delete</button>
            </div>`;
        }

        info.innerHTML = `
          <strong>Server Info:</strong><br>
          <div class='form-group'>
            Name: ${isAdmin ? `<input class='form-control' id="editName" value="${srv.name}">` :
              `<input class='form-control bg-white' readonly value="${srv.name}">`}

            ${isAdmin ? `
              Status: <select class='form-select' id="editStatus">
                <option ${srv.status === 'Active' ? 'selected' : ''}>Active</option>
                <option ${srv.status === 'Down' ? 'selected' : ''}>Down</option>
                <option ${srv.status === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
              </select>
            ` : `
              Status: <input class='form-control bg-white' readonly value="${srv.status}">
            `}

            CPU: ${isAdmin ? `<input class='form-control' id="editCPU" value="${srv.cpu}">` :
              `<input class='form-control bg-white' readonly value="${srv.cpu}">`}

            RAM: ${isAdmin ? `<input class='form-control' id="editRAM" value="${srv.ram}">` :
              `<input class='form-control bg-white' readonly value="${srv.ram}">`}

            Rack: ${isAdmin ? `<input class='form-control' id="editRack" value="${srv.rack}">` :
              `<input class='form-control bg-white' readonly value="${srv.rack}">`}

            Row: ${isAdmin ? `<input class='form-control' id="editRow" value="${srv.row}">` :
              `<input class='form-control bg-white' readonly value="${srv.row}">`}

            Last Maintenance: ${isAdmin ? `<input class='form-control' id="editLast" value="${srv.last_maintenance}">` :
              `<input class='form-control bg-white' readonly value="${srv.last_maintenance}">`}

            ${buttons}
          </div>
        `;
      };

      rackDiv.appendChild(srvDiv);
    });

    col.appendChild(rackDiv);
    map.appendChild(col);
  }
};

function showAddForm(rackId) {
  if (!isAdmin) return;

  const panel = document.getElementById('adminPanel');
  const info = document.getElementById('info');

  if (panel.innerHTML.includes(`Rack ${rackId}`)) {
    panel.innerHTML = '';
    return;
  }

  info.innerHTML = '';

  panel.innerHTML = `
    <h5>Add Server to Rack ${rackId}</h5>
    <div class="row g-2">
      <div class="col-md-4"><input class="form-control" id="addName" placeholder="Name"></div>
      <div class="col-md-4"><input class="form-control" id="addIP" placeholder="IP"></div>
      <div class="col-md-4">
        <select class="form-select" id="addStatus">
          <option>Active</option>
          <option>Down</option>
          <option>Maintenance</option>
        </select>
      </div>
      <div class="col-md-3"><input class="form-control" id="addCPU" placeholder="CPU"></div>
      <div class="col-md-3"><input class="form-control" id="addRAM" placeholder="RAM"></div>
      <div class="col-md-2"><input class="form-control" id="addRack" value="${rackId}" placeholder="Rack"></div>
      <div class="col-md-2"><input class="form-control" id="addRow" placeholder="Row"></div>
      <div class="col-md-2"><input class="form-control" id="addLast" placeholder="Last Maint."></div>
      <div class="col-12 mt-2">
        <button class="btn btn-primary" onclick="addServer()">Submit</button>
      </div>
    </div>
  `;
}

function addServer() {
  const newServer = {
    name: document.getElementById('addName').value.trim(),
    ip: document.getElementById('addIP').value.trim(),
    status: document.getElementById('addStatus').value,
    cpu: document.getElementById('addCPU').value.trim(),
    ram: document.getElementById('addRAM').value.trim(),
    rack: parseInt(document.getElementById('addRack').value),
    row: document.getElementById('addRow').value.trim(),
    last_maintenance: document.getElementById('addLast').value.trim()
  };

  axios.post('/api/add', newServer)
    .then(() => axios.get('/api/data'))
    .then(res => {
      servers = res.data;
      render();
      document.getElementById('adminPanel').innerHTML = '';
    })
    .catch(err => alert('Add failed: ' + (err.response?.data?.error || 'Unknown')));
}

function saveServer(ip) {
  if (!isAdmin) return;
  const updated = {
    ip: ip,
    name: document.getElementById('editName').value.trim(),
    status: document.getElementById('editStatus').value,
    cpu: document.getElementById('editCPU').value.trim(),
    ram: document.getElementById('editRAM').value.trim(),
    rack: parseInt(document.getElementById('editRack').value),
    row: document.getElementById('editRow').value.trim(),
    last_maintenance: document.getElementById('editLast').value.trim()
  };

  axios.post('/api/update', updated)
    .then(() => axios.get('/api/data'))
    .then(res => {
      servers = res.data;
      render();
    });
}

function deleteServer(ip) {
  if (!isAdmin) return;
  if (!confirm('Are you sure?')) return;
  axios.post('/api/delete', { ip })
    .then(() => axios.get('/api/data'))
    .then(res => {
      servers = res.data;
      render();
    });
}

function showDeleteRackForm() {
  if (!isAdmin) return;
  document.getElementById('adminPanel').innerHTML = `
    <div class="input-group">
      <input type="number" id="deleteRackId" placeholder="Rack number" class="form-control">
      <button class="btn btn-danger" onclick="deleteRack()">Delete Rack</button>
    </div>
  `;
}

function deleteRack() {
  if (!isAdmin) return;
  const rackId = parseInt(document.getElementById('deleteRackId').value);
  axios.post('/api/delete_rack', { rack: rackId })
    .then(() => axios.get('/api/data'))
    .then(res => {
      servers = res.data;
      render();
    });
}

function addRack() {
  if (!isAdmin) return;
  const rackId = parseInt(document.getElementById('newRack').value);
  if (isNaN(rackId)) {
    alert('Enter a valid number');
    return;
  }
  showAddForm(rackId);
}

axios.get('/api/data').then(res => {
  servers = res.data;
  render();
});

document.getElementById('searchBox')?.addEventListener('input', render);
document.getElementById('statusFilter')?.addEventListener('change', render);
