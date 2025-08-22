const recruiterId = localStorage.getItem("userId");

    // ===== Create Job =====
    async function createJob() {
      const job = {
        recruiter_id: recruiterId,
        title: document.getElementById("title").value,
        description: document.getElementById("description").value,
        location: document.getElementById("location").value,
        job_type: document.getElementById("job_type").value
      };
      await fetch("http://localhost:5000/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job)
      });
      loadJobs();
    }

    // ===== Load Jobs =====
    async function loadJobs() {
      const res = await fetch("http://localhost:5000/api/jobs");
      const jobs = await res.json();
      document.getElementById("jobs").innerHTML = jobs
        .filter(j => j.recruiter_id == recruiterId)
        .map(j => `
          <div class="job-card">
            <h4>${j.title}</h4>
            <p>${j.description}</p>
            <small>${j.location} - ${j.job_type}</small><br>
            <button onclick="deleteJob(${j.id})">Delete</button>
          </div>
        `).join("");
    }

    // ===== Delete Job =====
    async function deleteJob(id) {
      await fetch(`http://localhost:5000/api/jobs/${id}`, { method: "DELETE" });
      loadJobs();
      loadApplications(); // ✅ refresh applications too
    }

    // ===== Load Applications =====
    async function loadApplications() {
      const res = await fetch(`http://localhost:5000/api/applications/${recruiterId}`);
      const apps = await res.json();
      document.getElementById("applications").innerHTML = apps.map(a => `
        <div class="application-card">
          <strong>${a.seeker_name}</strong> applied for <em>${a.title}</em><br>
          Cover Letter: ${a.cover_letter}<br>
          Resume: ${a.resume ? `<a href="${a.resume}" target="_blank">View Resume</a>` : "No resume"}
        </div>
      `).join("");
    }

    // ===== Logout =====
    function logout() {
      localStorage.clear();
      window.location.href = "login.html";
    }

    // ===== Init =====
    loadJobs();
    loadApplications();