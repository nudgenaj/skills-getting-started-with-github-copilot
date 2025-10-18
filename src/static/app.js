document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to escape HTML in values displayed in the DOM
  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
  const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message / existing cards
      activitiesList.innerHTML = "";

      // Clear activity select options except the default first option
      while (activitySelect.options.length > 1) {
        activitySelect.remove(1);
      }

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const participantsArray = Array.isArray(details.participants) ? details.participants : [];
        const spotsLeft = details.max_participants - participantsArray.length;

        // Build participants list markup
        // Build participants list markup with delete buttons
        const participantsMarkup =
          participantsArray.length > 0
            ? participantsArray
                .map(
                  (p) =>
                    `<li class="participant-item" data-email="${escapeHtml(p)}"><span class="participant-email">${escapeHtml(
                      p
                    )}</span> <button class="delete-participant" title="Remove participant" aria-label="Remove ${escapeHtml(
                      p
                    )}">✖</button></li>`
                )
                .join("")
            : `<li class="no-participants">No participants yet</li>`;

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <h5>Participants (${participantsArray.length})</h5>
            <ul class="participants-list">
              ${participantsMarkup}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Attach click handlers for delete buttons (delegation)
      document.querySelectorAll(".delete-participant").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const li = e.target.closest(".participant-item");
          if (!li) return;
          const email = li.getAttribute("data-email");
          const activityName = li.closest(".activity-card").querySelector("h4").textContent;

          try {
            const resp = await fetch(
              `/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`,
              { method: "DELETE" }
            );

            const resJson = await resp.json();
            if (resp.ok) {
              // show success message
              messageDiv.textContent = resJson.message;
              messageDiv.className = "message success";
              messageDiv.classList.remove("hidden");
              // Refresh activities
              fetchActivities();
            } else {
              messageDiv.textContent = resJson.detail || "Failed to remove participant";
              messageDiv.className = "message error";
              messageDiv.classList.remove("hidden");
            }

            setTimeout(() => messageDiv.classList.add("hidden"), 5000);
          } catch (err) {
            console.error("Error removing participant:", err);
            messageDiv.textContent = "Failed to remove participant. Please try again.";
            messageDiv.className = "message error";
            messageDiv.classList.remove("hidden");
          }
        });
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        // keep message styling consistent with other flows
        messageDiv.className = "message success";
        signupForm.reset();

        // Refresh activities to show the new participant immediately
        // Await to ensure the UI is updated before continuing
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
