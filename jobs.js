document.addEventListener("DOMContentLoaded", async () => {
  const jobList = document.getElementById("job-list");
  const locSelect = document.getElementById("filter-location");

  // ===== Fetch Jobs from Backend =====
  async function loadJobs() {
    const res = await fetch("http://localhost:5000/api/jobs");
    const jobs = await res.json();

    // Populate location filter
    const locations = [...new Set(jobs.map(j => j.location))];
    locSelect.innerHTML = `<option value="">All Locations</option>` + 
      locations.map(l => `<option value="${l}">${l}</option>`).join("");

    renderJobs(jobs);
  }

  // ===== Render Job Cards =====
  function renderJobs(jobs) {
    jobList.innerHTML = jobs.map(job => `
      <div class="job-card" 
           data-location="${job.location}" 
           data-type="${job.job_type}"
           data-id="${job.id}">
        <div class="job-header">
          <div>
            <h3>${job.recruiter}</h3>
            <span class="job-title">${job.title}</span>
          </div>
        </div>
        <p class="job-desc">${job.description}</p>
        <p class="posted-date">${new Date(job.created_at).toLocaleDateString()}</p>
        <button class="apply-btn">Apply</button>
      </div>
    `).join("");

    attachApplyEvents();
  }

  // ===== Apply Modal =====
  const applyModal = document.getElementById("apply-modal");
  const applyForm = document.getElementById("apply-form");
  const modalJobTitle = document.getElementById("modal-job-title");
  let currentJobId = null;

  function attachApplyEvents() {
    document.querySelectorAll(".apply-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        const card = e.target.closest(".job-card");
        currentJobId = card.dataset.id;
        modalJobTitle.textContent = card.querySelector(".job-title").textContent;
        applyModal.style.display = "block";
      });
    });
  }

  document.querySelector(".close-btn").addEventListener("click", () => {
    applyModal.style.display = "none";
  });

  // ===== Submit Application =====
  applyForm.addEventListener("submit", async e => {
    e.preventDefault();

    const formData = new FormData(applyForm);
    const seekerId = localStorage.getItem("userId"); // from login

    const application = {
      job_id: currentJobId,
      seeker_id: seekerId,
      cover_letter: formData.get("cover"),
      resume: formData.get("resume")?.name || "" // basic handling for now
    };

    await fetch("http://localhost:5000/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(application)
    });

    alert("Application submitted!");
    applyModal.style.display = "none";
    applyForm.reset();
  });

  // ===== Filters =====
  document.querySelectorAll('.filters select').forEach(select => {
    select.addEventListener('change', async () => {
      const res = await fetch("http://localhost:5000/api/jobs");
      let jobs = await res.json();

      const loc = document.getElementById('filter-location').value;
      const typ = document.getElementById('filter-type').value;

      if (loc) jobs = jobs.filter(j => j.location === loc);
      if (typ) jobs = jobs.filter(j => j.job_type === typ);

      renderJobs(jobs);
    });
  });

  // ===== Initial Load =====
  loadJobs();
});
