// ===== TAB SWITCHING ===== 
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(btn.dataset.tab).classList.add('active');

    document.getElementById('filters').style.display =
      btn.dataset.tab === 'applied-tab' ? 'none' : 'flex';
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
      const matchDate =
        !days ||
        ((new Date() - new Date(card.dataset.date)) / (1000 * 60 * 60 * 24) <= parseInt(days));

      card.style.display = matchLoc && matchType && matchDate ? 'block' : 'none';
    });
  });
});

// ===== APPLIED JOBS FUNCTIONALITY =====
document.addEventListener("DOMContentLoaded", () => {
  const applyButtons = document.querySelectorAll(".apply-btn");
  const applyModal = document.getElementById("apply-modal");
  const applyForm = document.getElementById("apply-form");
  const modalJobTitle = document.getElementById("modal-job-title");
  const appliedJobsList = document.getElementById("applied-jobs-list");

  const appliedModal = document.getElementById("applied-job-modal");
  const appliedClose = document.getElementById("applied-close");
  const viewResumeBtn = document.getElementById("view-resume-btn");

  let currentJobCard = null;
  let uploadedResumeURL = "";

  // Open Apply Modal
  applyButtons.forEach(button => {
    button.addEventListener("click", e => {
      currentJobCard = e.target.closest(".job-card");
      modalJobTitle.textContent = currentJobCard.querySelector(".job-title").textContent;
      applyModal.style.display = "block";
    });
  });

  // Close Modals
  document.querySelectorAll(".close-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      applyModal.style.display = "none";
      appliedModal.style.display = "none";
    });
  });

  // Submit Application
  applyForm.addEventListener("submit", e => {
    e.preventDefault();

    const formData = new FormData(applyForm);
    const resumeFile = formData.get("resume");

    if (resumeFile) {
      uploadedResumeURL = URL.createObjectURL(resumeFile);
    }

    // Change button to Applied
    const applyBtn = currentJobCard.querySelector(".apply-btn");
    applyBtn.innerHTML = "&#10003; Applied";
    applyBtn.disabled = true;
    applyBtn.classList.add("applied");

    // Clone job card for Applied Jobs tab
    const jobClone = currentJobCard.cloneNode(true);
    const btn = jobClone.querySelector(".apply-btn");
    if (btn) btn.remove(); // Remove original button

    // Add view details button
    const detailsBtn = document.createElement("button");
    detailsBtn.textContent = "View Details";
    detailsBtn.classList.add("view-details-btn");
    jobClone.appendChild(detailsBtn);

    // Save form details into dataset for later viewing
    jobClone.dataset.name = formData.get("fullname");
    jobClone.dataset.email = formData.get("email");
    jobClone.dataset.mobile = formData.get("mobile");
    jobClone.dataset.skills = formData.get("skills");
    jobClone.dataset.cover = formData.get("cover");
    jobClone.dataset.resume = uploadedResumeURL;

    detailsBtn.addEventListener("click", () => openAppliedModal(jobClone));

    // Remove only the "No applied jobs yet" message, not the existing cards
    const noJobsMsg = appliedJobsList.querySelector("p");
    if (noJobsMsg) {
      noJobsMsg.remove();
    }

    appliedJobsList.appendChild(jobClone);

    updateAppliedJobsLayout();

    // Close modal and reset form
    applyModal.style.display = "none";
    applyForm.reset();
  });

  // Open Applied Job Details Modal
  function openAppliedModal(jobCard) {
    document.getElementById("applied-modal-logo").src = jobCard.querySelector(".company-logo").src;
    document.getElementById("applied-modal-title").textContent = jobCard.querySelector("h3").textContent;
    document.getElementById("applied-modal-role").textContent = jobCard.querySelector(".job-title").textContent;
    document.getElementById("applied-modal-desc").textContent = jobCard.querySelector(".job-desc").textContent;
    document.getElementById("applied-modal-name").textContent = jobCard.dataset.name;
    document.getElementById("applied-modal-email").textContent = jobCard.dataset.email;
    document.getElementById("applied-modal-mobile").textContent = jobCard.dataset.mobile;
    document.getElementById("applied-modal-skills").textContent = jobCard.dataset.skills;
    document.getElementById("applied-modal-cover").textContent = jobCard.dataset.cover;
    appliedModal.dataset.resume = jobCard.dataset.resume;

    appliedModal.style.display = "block";
  }

  // View Resume in New Tab only
  viewResumeBtn.addEventListener("click", () => {
    const resumeURL = appliedModal.dataset.resume;
    if (resumeURL) {
      window.open(resumeURL, "_blank");
    } else {
      alert("No resume uploaded.");
    }
  });

  // Close applied modal
  appliedClose.addEventListener("click", () => {
    appliedModal.style.display = "none";
  });

  // ===== Update layout based on job count =====
  function updateAppliedJobsLayout() {
    const hasJobs = appliedJobsList.querySelectorAll('.job-card').length > 0;

    if (!hasJobs) {
      appliedJobsList.style.display = "flex";
      appliedJobsList.style.justifyContent = "center";
      appliedJobsList.style.alignItems = "center";
      appliedJobsList.innerHTML = '<p>No applied jobs yet.</p>';
    } else {
      appliedJobsList.style.display = "grid";
      appliedJobsList.style.gridTemplateColumns = "repeat(3, 1fr)";
      appliedJobsList.style.gap = "20px";

      // Force text alignment left for description & date
      appliedJobsList.querySelectorAll(".job-desc").forEach(desc => {
        desc.style.textAlign = "left";
        desc.style.fontSize = "16px";
        desc.style.color = "#333";
      });

      appliedJobsList.querySelectorAll(".posted-date").forEach(date => {
        date.style.textAlign = "left";
        date.style.fontSize = "15px";
        date.style.color = "#555";
      });
    }
  }

  // ===== Initial check =====
  updateAppliedJobsLayout();
});
