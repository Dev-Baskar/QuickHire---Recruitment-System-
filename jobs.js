// ===== TAB SWITCHING =====
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(btn.dataset.tab).classList.add('active');

    document.getElementById('filters').style.display = btn.dataset.tab === 'applied-tab' ? 'none' : 'flex';
  });
});

// ===== POPULATE LOCATION FILTER =====
(function populateLocations() {
  const locSelect = document.getElementById('filter-location');
  const locations = new Set();
  document.querySelectorAll('#job-list .job-card').forEach(card => {
    locations.add(card.dataset.location);
  });
  locations.forEach(loc => {
    locSelect.innerHTML += `<option value="${loc}">${loc}</option>`;
  });
})();

// ===== FILTER JOBS =====
document.querySelectorAll('.filters select').forEach(select => {
  select.addEventListener('change', () => {
    const loc = document.getElementById('filter-location').value;
    const typ = document.getElementById('filter-type').value;
    const days = document.getElementById('filter-date').value;

    document.querySelectorAll('#job-list .job-card').forEach(card => {
      const matchLoc = !loc || card.dataset.location === loc;
      const matchType = !typ || card.dataset.type === typ;
      const matchDate = !days || ( (new Date() - new Date(card.dataset.date)) / (1000*60*60*24) <= parseInt(days) );

      card.style.display = (matchLoc && matchType && matchDate) ? 'block' : 'none';
    });
  });
});

// ===== MODAL & APPLY FUNCTIONALITY =====
const modal = document.getElementById('apply-modal');
const closeBtn = document.querySelector('.close-btn');
const modalTitle = document.getElementById('modal-job-title');
const applyForm = document.getElementById('apply-form');
let currentJob = {};

document.querySelectorAll('.apply-btn').forEach(btn => {
  btn.addEventListener('click', e => {
    const card = e.target.closest('.job-card');
    currentJob = {
      title: card.querySelector('.job-title').textContent,
      company: card.querySelector('h3').textContent,
      description: card.querySelector('.job-desc').textContent,
      dateApplied: new Date().toISOString()
    };
    modalTitle.textContent = `${currentJob.company} - ${currentJob.title}`;
    modal.style.display = 'block';
  });
});

closeBtn.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });

applyForm.addEventListener('submit', e => {
  e.preventDefault();
  const formData = new FormData(applyForm);
  currentJob.fullname = formData.get('fullname');
  currentJob.mobile = formData.get('mobile');
  currentJob.email = formData.get('email');
  currentJob.skills = formData.get('skills');
  currentJob.cover = formData.get('cover');
  currentJob.resume = formData.get('resume');

  let appliedJobs = JSON.parse(localStorage.getItem('appliedJobs')) || [];
  appliedJobs.push(currentJob);
  localStorage.setItem('appliedJobs', JSON.stringify(appliedJobs));

  alert('Application submitted successfully!');
  modal.style.display = 'none';
  applyForm.reset();
  loadAppliedJobs();
});

// ===== LOAD APPLIED JOBS =====
function loadAppliedJobs() {
  const appliedJobs = JSON.parse(localStorage.getItem('appliedJobs')) || [];
  const list = document.getElementById('applied-jobs-list');

  if (appliedJobs.length === 0) {
    // Keep only the message
    list.innerHTML = '<p>No applied jobs yet.</p>';
  } else {
    list.innerHTML = ""; // remove the message
    appliedJobs.forEach(job => {
      const div = document.createElement('div');
      div.classList.add('job-card');
      div.innerHTML = `
        <h3>${job.company} - ${job.title}</h3>
        <p>${job.description}</p>
        <p><strong>Applied on:</strong> ${new Date(job.dateApplied).toLocaleDateString()}</p>
        <p><strong>Name:</strong> ${job.fullname}</p>
        <p><strong>Email:</strong> ${job.email}</p>
        <p><strong>Mobile:</strong> ${job.mobile}</p>
        <p><strong>Skills:</strong> ${job.skills}</p>
        ${job.cover ? `<p><strong>Cover Letter:</strong> ${job.cover}</p>` : ""}
      `;
      list.appendChild(div);
    });
  }
}


(function populateLocations() {
  const locSelect = document.getElementById('filter-location');
  const locations = new Set();

  document.querySelectorAll('#job-list .location').forEach(locationElem => {
    const locText = locationElem.textContent.trim();
    if (locText) {
      locations.add(locText);
    }
  });

  // Sort locations alphabetically
  [...locations].sort().forEach(loc => {
    locSelect.innerHTML += `<option value="${loc}">${loc}</option>`;
  });
})();
