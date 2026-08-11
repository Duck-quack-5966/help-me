/* =========================================================
   CARE — Home / Project Dashboard
   ========================================================= */

(() => {
  "use strict";

  const STORAGE_KEY = "care_projects";
  const CURRENT_PROJECT_KEY = "care_current_project";

  /* =========================================================
     DOM HELPERS
     ========================================================= */

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  /* =========================================================
     STORAGE
     ========================================================= */

  function getProjects() {
    try {
      return JSON.parse(
        localStorage.getItem(STORAGE_KEY)
      ) || [];
    } catch (error) {
      console.error(
        "Could not load CARE projects:",
        error
      );

      return [];
    }
  }

  function saveProjects(projects) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(projects)
      );

      return true;
    } catch (error) {
      console.error(
        "Could not save CARE projects:",
        error
      );

      return false;
    }
  }

  /* =========================================================
     PROJECT ID
     ========================================================= */

  function generateProjectId() {
    return (
      "project-" +
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .substring(2, 8)
    );
  }

  /* =========================================================
     CREATE NEW PROJECT
     ========================================================= */

  function createNewProject() {
    const project = {
      id: generateProjectId(),

      name: "Untitled Project",

      coverImage: null,

      cameras: {
        1: {
          type: "webcam",
          deviceId: "",
          url: "",
          connected: false
        },

        2: {
          type: "webcam",
          deviceId: "",
          url: "",
          connected: false
        }
      },

      climate: {
        temperature: null,
        humidity: null,
        status: "Simulated"
      },

      artifact: {
        description: "",
        period: "",
        material: "",
        location: "",
        condition: "",
        notes: ""
      },

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString()
    };

    const projects = getProjects();

    projects.push(project);

    saveProjects(projects);

    localStorage.setItem(
      CURRENT_PROJECT_KEY,
      project.id
    );

    /*
      Open the editor for this project.
    */

    window.location.href =
      `create.html?id=${encodeURIComponent(project.id)}`;
  }

  /* =========================================================
     OPEN PROJECT
     ========================================================= */

  function openProject(projectId) {
    localStorage.setItem(
      CURRENT_PROJECT_KEY,
      projectId
    );

    window.location.href =
      `create.html?id=${encodeURIComponent(projectId)}`;
  }

  /* =========================================================
     DELETE PROJECT
     ========================================================= */

  function deleteProject(projectId) {
    const projects = getProjects();

    const project =
      projects.find(
        item => item.id === projectId
      );

    if (!project) return;

    const confirmed = confirm(
      `Delete "${project.name || "Untitled Project"}"?\n\nThis cannot be undone.`
    );

    if (!confirmed) return;

    const remaining =
      projects.filter(
        item => item.id !== projectId
      );

    saveProjects(remaining);

    /*
      If this was the current project,
      clear it.
    */

    const current =
      localStorage.getItem(
        CURRENT_PROJECT_KEY
      );

    if (current === projectId) {
      localStorage.removeItem(
        CURRENT_PROJECT_KEY
      );
    }

    renderProjects();
  }

  /* =========================================================
     FORMAT DATE
     ========================================================= */

  function formatDate(dateString) {
    if (!dateString) {
      return "No date";
    }

    const date =
      new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "No date";
    }

    return date.toLocaleDateString(
      undefined,
      {
        day: "numeric",
        month: "short",
        year: "numeric"
      }
    );
  }

  /* =========================================================
     CAMERA COUNT
     ========================================================= */

  function getConnectedCameraCount(project) {
    if (!project.cameras) {
      return 0;
    }

    return Object.values(
      project.cameras
    ).filter(
      camera => camera && camera.connected
    ).length;
  }

  /* =========================================================
     CLIMATE DISPLAY
     ========================================================= */

  function getClimateText(project) {
    const climate =
      project.climate;

    if (!climate) {
      return "No sensor data";
    }

    const temperature =
      climate.temperature;

    const humidity =
      climate.humidity;

    if (
      temperature === null ||
      temperature === undefined
    ) {
      return "No sensor data";
    }

    if (
      humidity === null ||
      humidity === undefined
    ) {
      return `${Number(temperature).toFixed(1)} °C`;
    }

    return (
      `${Number(temperature).toFixed(1)} °C · ` +
      `${Number(humidity).toFixed(1)} %`
    );
  }

  /* =========================================================
     CREATE PROJECT CARD
     ========================================================= */

  function createProjectCard(project) {
    const card =
      document.createElement("article");

    card.className =
      "project-card";

    card.dataset.projectId =
      project.id;

    /* =====================================================
       COVER
       ===================================================== */

    const cover =
      document.createElement("div");

    cover.className =
      "project-card-cover";

    if (project.coverImage) {
      const image =
        document.createElement("img");

      image.src =
        project.coverImage;

      image.alt =
        `${project.name || "Project"} cover`;

      cover.appendChild(image);

    } else {
      const placeholder =
        document.createElement("div");

      placeholder.className =
        "project-card-placeholder";

      placeholder.textContent =
        "C.A.R.E";

      cover.appendChild(
        placeholder
      );
    }

    /* =====================================================
       CARD CONTENT
       ===================================================== */

    const content =
      document.createElement("div");

    content.className =
      "project-card-content";

    const title =
      document.createElement("h2");

    title.className =
      "project-card-title";

    title.textContent =
      project.name ||
      "Untitled Project";

    const date =
      document.createElement("p");

    date.className =
      "project-card-date";

    date.textContent =
      `Last updated: ${formatDate(project.updatedAt)}`;

    /* =====================================================
       INFORMATION
       ===================================================== */

    const info =
      document.createElement("div");

    info.className =
      "project-card-info";

    /* Cameras */

    const cameraInfo =
      document.createElement("span");

    cameraInfo.className =
      "project-info-item";

    const cameraCount =
      getConnectedCameraCount(project);

    cameraInfo.innerHTML =
      `📷 ${cameraCount}/2 cameras`;

    /* Climate */

    const climateInfo =
      document.createElement("span");

    climateInfo.className =
      "project-info-item";

    climateInfo.innerHTML =
      `🌡️ ${getClimateText(project)}`;

    info.appendChild(
      cameraInfo
    );

    info.appendChild(
      climateInfo
    );

    /* =====================================================
       BUTTONS
       ===================================================== */

    const actions =
      document.createElement("div");

    actions.className =
      "project-card-actions";

    const openButton =
      document.createElement("button");

    openButton.type =
      "button";

    openButton.className =
      "project-open-btn";

    openButton.textContent =
      "Open Project";

    openButton.addEventListener(
      "click",
      event => {
        event.stopPropagation();

        openProject(
          project.id
        );
      }
    );

    const deleteButton =
      document.createElement("button");

    deleteButton.type =
      "button";

    deleteButton.className =
      "project-delete-btn";

    deleteButton.textContent =
      "Delete";

    deleteButton.addEventListener(
      "click",
      event => {
        event.stopPropagation();

        deleteProject(
          project.id
        );
      }
    );

    actions.appendChild(
      openButton
    );

    actions.appendChild(
      deleteButton
    );

    /* =====================================================
       ASSEMBLE CARD
       ===================================================== */

    content.appendChild(
      title
    );

    content.appendChild(
      date
    );

    content.appendChild(
      info
    );

    content.appendChild(
      actions
    );

    card.appendChild(
      cover
    );

    card.appendChild(
      content
    );

    /*
      Clicking the card itself opens it.
    */

    card.addEventListener(
      "click",
      () => {
        openProject(
          project.id
        );
      }
    );

    return card;
  }

  /* =========================================================
     RENDER PROJECTS
     ========================================================= */

  function renderProjects() {
    const container =
      $("#project-container");

    const emptyState =
      $("#empty-state");

    if (!container) {
      console.error(
        "Missing #project-container"
      );

      return;
    }

    const projects =
      getProjects();

    /*
      Remove all old project cards.

      Keep the + button.
    */

    const addLink =
      $("#add-link");

    container.innerHTML = "";

    /*
      Display empty state.
    */

    if (projects.length === 0) {
      if (emptyState) {
        emptyState.style.display =
          "block";
      }
    } else {
      if (emptyState) {
        emptyState.style.display =
          "none";
      }
    }

    /*
      Add project cards.
    */

    projects.forEach(
      project => {
        const card =
          createProjectCard(
            project
          );

        container.appendChild(
          card
        );
      }
    );

    /*
      Add the + button LAST.
    */

    if (addLink) {
      container.appendChild(
        addLink
      );
    }
  }

  /* =========================================================
     ADD BUTTON
     ========================================================= */

  function setupAddButton() {
    const addButton =
      $("#add-btn");

    if (!addButton) {
      return;
    }

    addButton.addEventListener(
      "click",
      event => {
        event.preventDefault();

        createNewProject();
      }
    );
  }

  /* =========================================================
     INITIALIZE
     ========================================================= */

  function init() {
    renderProjects();

    setupAddButton();
  }

  /* =========================================================
     REFRESH WHEN RETURNING TO PAGE
     ========================================================= */

  window.addEventListener(
    "pageshow",
    () => {
      renderProjects();
    }
  );

  window.addEventListener(
    "storage",
    () => {
      renderProjects();
    }
  );

  /* =========================================================
     START
     ========================================================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();
