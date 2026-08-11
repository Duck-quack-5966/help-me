/* =========================================================
   CARE — Create / Edit Project
   ========================================================= */

(() => {
  "use strict";

  const STORAGE_KEY = "care_projects";
  const CURRENT_PROJECT_KEY = "care_current_project";

  let currentProject = null;
  let cameraStreams = {};
  let saveTimeout = null;

  /* =========================================================
     DOM HELPERS
     ========================================================= */

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];

  /* =========================================================
     PROJECT STORAGE
     ========================================================= */

  function getProjects() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (error) {
      console.error("Could not read CARE projects:", error);
      return [];
    }
  }

  function saveProjects(projects) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      return true;
    } catch (error) {
      console.error("Could not save CARE projects:", error);

      alert(
        "The project could not be saved. Your cover image may be too large."
      );

      return false;
    }
  }

  function getCurrentProjectId() {
    const params = new URLSearchParams(window.location.search);

    return (
      params.get("id") ||
      localStorage.getItem(CURRENT_PROJECT_KEY)
    );
  }

  function generateProjectId() {
    return (
      "project-" +
      Date.now() +
      "-" +
      Math.random().toString(36).substring(2, 8)
    );
  }

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

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const projects = getProjects();

    projects.push(project);

    saveProjects(projects);

    localStorage.setItem(CURRENT_PROJECT_KEY, project.id);

    return project;
  }

  function loadProject() {
    let projectId = getCurrentProjectId();

    /*
      If there is no project selected, create one automatically.

      This means going directly to:
      create.html

      will still work.
    */

    if (!projectId) {
      currentProject = createNewProject();
      return;
    }

    const projects = getProjects();

    currentProject = projects.find(
      project => project.id === projectId
    );

    /*
      If the ID does not exist anymore, create a new project.
    */

    if (!currentProject) {
      currentProject = createNewProject();
    }

    localStorage.setItem(
      CURRENT_PROJECT_KEY,
      currentProject.id
    );
  }

  function updateProject() {
    if (!currentProject) return;

    currentProject.updatedAt = new Date().toISOString();

    const projects = getProjects();

    const index = projects.findIndex(
      project => project.id === currentProject.id
    );

    if (index === -1) {
      projects.push(currentProject);
    } else {
      projects[index] = currentProject;
    }

    saveProjects(projects);
  }

  /* =========================================================
     SAVE INDICATOR
     ========================================================= */

  function showSaving() {
    const indicator = $("#save-indicator");

    if (!indicator) return;

    indicator.textContent = "Saving...";
    indicator.classList.add("saving");
  }

  function showSaved() {
    const indicator = $("#save-indicator");

    if (!indicator) return;

    indicator.textContent = "All changes saved";
    indicator.classList.remove("saving");
  }

  function scheduleSave() {
    showSaving();

    clearTimeout(saveTimeout);

    saveTimeout = setTimeout(() => {
      updateProject();
      showSaved();
    }, 400);
  }

  /* =========================================================
     LOAD PROJECT INTO PAGE
     ========================================================= */

  function loadProjectIntoPage() {
    if (!currentProject) return;

    $("#project-editor").style.display = "block";
    $("#no-project-message").style.display = "none";

    /* Project name */

    $("#project-name-input").value =
      currentProject.name || "";

    /* Cover image */

    if (currentProject.coverImage) {
      showCoverImage(currentProject.coverImage);
    }

    /* Artifact */

    const artifact = currentProject.artifact || {};

    $("#artifact-description").value =
      artifact.description || "";

    $("#artifact-period").value =
      artifact.period || "";

    $("#artifact-material").value =
      artifact.material || "";

    $("#artifact-location").value =
      artifact.location || "";

    $("#artifact-condition").value =
      artifact.condition || "";

    $("#artifact-notes").value =
      artifact.notes || "";

    /* Climate */

    if (currentProject.climate) {
      updateClimateDisplay(
        currentProject.climate.temperature,
        currentProject.climate.humidity,
        currentProject.climate.status
      );
    }

    /* Camera settings */

    setupCameraCards();

    showSaved();
  }

  /* =========================================================
     PROJECT NAME
     ========================================================= */

  function setupProjectName() {
    const input = $("#project-name-input");

    if (!input) return;

    input.addEventListener("input", () => {
      currentProject.name =
        input.value.trim() || "Untitled Project";

      scheduleSave();
    });
  }

  /* =========================================================
     COVER IMAGE
     ========================================================= */

  function setupCoverUpload() {
    const input = $("#cover-image-input");

    if (!input) return;

    input.addEventListener("change", event => {
      const file = event.target.files[0];

      if (!file) return;

      if (!file.type.startsWith("image/")) {
        alert("Please select an image file.");
        return;
      }

      /*
        Resize large images before saving them.

        This helps prevent localStorage from becoming too large.
      */

      resizeImage(file, 1200, 0.8)
        .then(base64 => {
          currentProject.coverImage = base64;

          showCoverImage(base64);

          scheduleSave();
        })
        .catch(error => {
          console.error("Image upload failed:", error);
          alert("Could not load that image.");
        });
    });
  }

  function resizeImage(file, maxSize, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = event => {
        const img = new Image();

        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxSize || height > maxSize) {
            const scale =
              Math.min(maxSize / width, maxSize / height);

            width *= scale;
            height *= scale;
          }

          const canvas = document.createElement("canvas");

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");

          ctx.drawImage(
            img,
            0,
            0,
            width,
            height
          );

          resolve(
            canvas.toDataURL(
              "image/jpeg",
              quality
            )
          );
        };

        img.onerror = reject;

        img.src = event.target.result;
      };

      reader.onerror = reject;

      reader.readAsDataURL(file);
    });
  }

  function showCoverImage(src) {
    const img = $("#cover-preview-img");
    const placeholder = $("#cover-preview-placeholder");

    img.src = src;
    img.style.display = "block";

    if (placeholder) {
      placeholder.style.display = "none";
    }
  }

  /* =========================================================
     ARTIFACT INFORMATION
     ========================================================= */

  function setupArtifactFields() {
    const fields = {
      "#artifact-description": "description",
      "#artifact-period": "period",
      "#artifact-material": "material",
      "#artifact-location": "location",
      "#artifact-condition": "condition",
      "#artifact-notes": "notes"
    };

    Object.entries(fields).forEach(
      ([selector, property]) => {
        const element = $(selector);

        if (!element) return;

        element.addEventListener("input", () => {
          currentProject.artifact[property] =
            element.value;

          scheduleSave();
        });

        element.addEventListener("change", () => {
          currentProject.artifact[property] =
            element.value;

          scheduleSave();
        });
      }
    );
  }

  /* =========================================================
     CAMERA SYSTEM
     ========================================================= */

  function setupCameraCards() {
    const cards = $$(".camera-card");

    cards.forEach(card => {
      const cameraNumber =
        card.dataset.camera;

      const typeSelect =
        $(".camera-type-select", card);

      const urlInput =
        $(".camera-url-input", card);

      const connectButton =
        $(".camera-connect-btn", card);

      const camera =
        currentProject.cameras[cameraNumber];

      if (!camera) return;

      typeSelect.value =
        camera.type || "webcam";

      if (camera.url) {
        urlInput.value = camera.url;
      }

      updateCameraInputVisibility(card);

      typeSelect.addEventListener(
        "change",
        () => {
          updateCameraInputVisibility(card);

          stopCamera(cameraNumber);

          currentProject.cameras[cameraNumber] = {
            ...currentProject.cameras[cameraNumber],
            type: typeSelect.value,
            connected: false
          };

          updateCameraStatus(
            card,
            false,
            "Not connected"
          );

          scheduleSave();
        }
      );

      connectButton.addEventListener(
        "click",
        () => {
          connectCamera(cameraNumber);
        }
      );
    });

    /*
      Add actual camera device selectors.
    */

    addCameraDeviceSelectors();
  }

  function updateCameraInputVisibility(card) {
    const typeSelect =
      $(".camera-type-select", card);

    const urlInput =
      $(".camera-url-input", card);

    if (typeSelect.value === "ip") {
      urlInput.style.display = "block";
    } else {
      urlInput.style.display = "none";
    }
  }

  async function addCameraDeviceSelectors() {
    /*
      We only need to ask for permission once.

      Without permission, browsers usually hide the
      actual camera names.
    */

    try {
      const devices =
        await navigator.mediaDevices.enumerateDevices();

      const cameras =
        devices.filter(
          device => device.kind === "videoinput"
        );

      $$(".camera-card").forEach(card => {
        const select =
          $(".camera-type-select", card);

        /*
          Don't add duplicates.
        */

        if (
          $(".camera-device-select", card)
        ) {
          return;
        }

        const deviceSelect =
          document.createElement("select");

        deviceSelect.className =
          "camera-device-select";

        const defaultOption =
          document.createElement("option");

        defaultOption.value = "";
        defaultOption.textContent =
          "Auto-select camera";

        deviceSelect.appendChild(
          defaultOption
        );

        cameras.forEach(
          (camera, index) => {
            const option =
              document.createElement("option");

            option.value =
              camera.deviceId;

            option.textContent =
              camera.label ||
              `Camera ${index + 1}`;

            deviceSelect.appendChild(option);
          }
        );

        select.insertAdjacentElement(
          "afterend",
          deviceSelect
        );

        const cameraNumber =
          card.dataset.camera;

        const savedDevice =
          currentProject.cameras[cameraNumber]
            ?.deviceId;

        if (savedDevice) {
          deviceSelect.value =
            savedDevice;
        }

        deviceSelect.addEventListener(
          "change",
          () => {
            currentProject.cameras[
              cameraNumber
            ].deviceId = deviceSelect.value;

            stopCamera(cameraNumber);

            scheduleSave();
          }
        );
      });
    } catch (error) {
      console.warn(
        "Could not enumerate cameras:",
        error
      );
    }
  }

  async function connectCamera(cameraNumber) {
    const card =
      $(`.camera-card[data-camera="${cameraNumber}"]`);

    if (!card) return;

    const typeSelect =
      $(".camera-type-select", card);

    const urlInput =
      $(".camera-url-input", card);

    const video =
      $(".camera-video", card);

    const streamImage =
      $(".camera-stream-img", card);

    const placeholder =
      $(".camera-placeholder", card);

    const type =
      typeSelect.value;

    /*
      Stop an existing connection first.
    */

    stopCamera(cameraNumber);

    if (type === "webcam") {
      await connectWebcam(
        cameraNumber,
        card,
        video,
        streamImage,
        placeholder
      );
    }

    if (type === "ip") {
      connectIPCamera(
        cameraNumber,
        card,
        urlInput.value.trim(),
        video,
        streamImage,
        placeholder
      );
    }
  }

  /* =========================================================
     WEBCAM
     ========================================================= */

  async function connectWebcam(
    cameraNumber,
    card,
    video,
    streamImage,
    placeholder
  ) {
    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      updateCameraStatus(
        card,
        false,
        "Camera API unavailable"
      );

      return;
    }

    try {
      /*
        Ask for camera permission.

        We use the saved device if there is one.
      */

      const savedDevice =
        currentProject.cameras[cameraNumber]
          ?.deviceId;

      const constraints = {
        video: savedDevice
          ? {
              deviceId: {
                exact: savedDevice
              }
            }
          : {
              facingMode: "user"
            },

        audio: false
      };

      const stream =
        await navigator.mediaDevices.getUserMedia(
          constraints
        );

      cameraStreams[cameraNumber] =
        stream;

      video.srcObject = stream;

      video.style.display = "block";
      streamImage.style.display = "none";
      placeholder.style.display = "none";

      await video.play();

      /*
        Save the actual camera device ID.
      */

      const track =
        stream.getVideoTracks()[0];

      const settings =
        track.getSettings();

      if (settings.deviceId) {
        currentProject.cameras[
          cameraNumber
        ].deviceId =
          settings.deviceId;
      }

      currentProject.cameras[
        cameraNumber
      ].connected = true;

      updateCameraStatus(
        card,
        true,
        "Connected"
      );

      /*
        Refresh the camera dropdown after permission.
      */

      await refreshCameraLists();

      scheduleSave();

    } catch (error) {
      console.error(
        `Camera ${cameraNumber} error:`,
        error
      );

      let message =
        "Could not connect";

      if (error.name === "NotAllowedError") {
        message =
          "Camera permission denied";
      }

      if (error.name === "NotFoundError") {
        message =
          "No camera found";
      }

      if (error.name === "NotReadableError") {
        message =
          "Camera is already in use";
      }

      updateCameraStatus(
        card,
        false,
        message
      );
    }
  }

  /* =========================================================
     REFRESH CAMERA LIST
     ========================================================= */

  async function refreshCameraLists() {
    try {
      const devices =
        await navigator.mediaDevices.enumerateDevices();

      const cameras =
        devices.filter(
          device =>
            device.kind === "videoinput"
        );

      $$(".camera-card").forEach(card => {
        const deviceSelect =
          $(".camera-device-select", card);

        if (!deviceSelect) return;

        const cameraNumber =
          card.dataset.camera;

        const selected =
          currentProject.cameras[
            cameraNumber
          ]?.deviceId || "";

        deviceSelect.innerHTML = "";

        const autoOption =
          document.createElement("option");

        autoOption.value = "";
        autoOption.textContent =
          "Auto-select camera";

        deviceSelect.appendChild(
          autoOption
        );

        cameras.forEach(
          (camera, index) => {
            const option =
              document.createElement("option");

            option.value =
              camera.deviceId;

            option.textContent =
              camera.label ||
              `Camera ${index + 1}`;

            deviceSelect.appendChild(
              option
            );
          }
        );

        deviceSelect.value = selected;
      });
    } catch (error) {
      console.error(
        "Could not refresh camera list:",
        error
      );
    }
  }

  /* =========================================================
     IP CAMERA
     ========================================================= */

  function connectIPCamera(
    cameraNumber,
    card,
    url,
    video,
    streamImage,
    placeholder
  ) {
    if (!url) {
      updateCameraStatus(
        card,
        false,
        "Enter a stream URL"
      );

      return;
    }

    /*
      Important:
      Browsers cannot normally play RTSP directly.

      HTTP/MJPEG streams can often be displayed
      using an <img>.
    */

    if (url.toLowerCase().startsWith("rtsp://")) {
      updateCameraStatus(
        card,
        false,
        "RTSP needs a web-compatible proxy"
      );

      alert(
        "Browsers cannot normally display RTSP directly.\n\n" +
        "Use an HTTP/MJPEG/HLS/WebRTC stream, " +
        "or connect the RTSP camera through a server."
      );

      return;
    }

    currentProject.cameras[
      cameraNumber
    ].url = url;

    /*
      Use an image for MJPEG / HTTP streams.
    */

    streamImage.src = "";

    streamImage.onload = () => {
      video.style.display = "none";
      streamImage.style.display = "block";
      placeholder.style.display = "none";

      currentProject.cameras[
        cameraNumber
      ].connected = true;

      updateCameraStatus(
        card,
        true,
        "Connected"
      );

      scheduleSave();
    };

    streamImage.onerror = () => {
      video.style.display = "none";
      streamImage.style.display = "none";
      placeholder.style.display = "block";

      currentProject.cameras[
        cameraNumber
      ].connected = false;

      updateCameraStatus(
        card,
        false,
        "Could not load stream"
      );
    };

    streamImage.src = url;
  }

  /* =========================================================
     STOP CAMERA
     ========================================================= */

  function stopCamera(cameraNumber) {
    const stream =
      cameraStreams[cameraNumber];

    if (stream) {
      stream
        .getTracks()
        .forEach(track => track.stop());

      delete cameraStreams[cameraNumber];
    }

    const card =
      $(`.camera-card[data-camera="${cameraNumber}"]`);

    if (card) {
      const video =
        $(".camera-video", card);

      if (video) {
        video.srcObject = null;
      }

      const streamImage =
        $(".camera-stream-img", card);

      if (streamImage) {
        streamImage.src = "";
        streamImage.style.display =
          "none";
      }

      const placeholder =
        $(".camera-placeholder", card);

      if (placeholder) {
        placeholder.style.display =
          "flex";
      }
    }

    if (
      currentProject &&
      currentProject.cameras[cameraNumber]
    ) {
      currentProject.cameras[
        cameraNumber
      ].connected = false;
    }
  }

  /* =========================================================
     CAMERA STATUS
     ========================================================= */

  function updateCameraStatus(
    card,
    connected,
    text
  ) {
    const dot =
      $(".status-dot", card);

    const statusText =
      $(".status-text", card);

    if (statusText) {
      statusText.textContent = text;
    }

    if (dot) {
      dot.classList.toggle(
        "connected",
        connected
      );
    }
  }

  /* =========================================================
     TEMPERATURE + HUMIDITY
     ========================================================= */

  function updateClimateDisplay(
    temperature,
    humidity,
    status = "Live"
  ) {
    const temp =
      $("#temperature-value");

    const hum =
      $("#humidity-value");

    const sensorStatus =
      $("#sensor-status-value");

    if (temp) {
      temp.textContent =
        temperature === null ||
        temperature === undefined
          ? "--"
          : `${Number(temperature).toFixed(1)} °C`;
    }

    if (hum) {
      hum.textContent =
        humidity === null ||
        humidity === undefined
          ? "--"
          : `${Number(humidity).toFixed(1)} %`;
    }

    if (sensorStatus) {
      sensorStatus.textContent =
        status || "Live";
    }
  }

  /* =========================================================
     SIMULATED SENSOR
     ========================================================= */

  function startSimulatedSensor() {
    /*
      Only simulate if there isn't already
      a real reading.
    */

    if (
      currentProject.climate.temperature !== null &&
      currentProject.climate.status !== "Simulated"
    ) {
      return;
    }

    let temperature = 24 + Math.random() * 3;
    let humidity = 55 + Math.random() * 10;

    function updateSimulation() {
      /*
        Small random changes so the values
        look like a real sensor.
      */

      temperature +=
        (Math.random() - 0.5) * 0.3;

      humidity +=
        (Math.random() - 0.5) * 0.8;

      temperature =
        Math.max(
          20,
          Math.min(30, temperature)
        );

      humidity =
        Math.max(
          40,
          Math.min(80, humidity)
        );

      currentProject.climate = {
        temperature,
        humidity,
        status: "Simulated"
      };

      updateClimateDisplay(
        temperature,
        humidity,
        "Simulated"
      );

      /*
        Don't save every simulated tick.
        The simulated values are temporary.
      */
    }

    updateSimulation();

    setInterval(
      updateSimulation,
      3000
    );
  }

  /* =========================================================
     REAL SENSOR INTEGRATION
     =========================================================

     Your ESP32 can eventually call:

       CareSensors.receiveReading({
         temperature: 25.4,
         humidity: 63.2
       });

     Example:
  */

  window.CareSensors = {
    receiveReading(data) {
      if (!data) return;

      const temperature =
        Number(data.temperature);

      const humidity =
        Number(data.humidity);

      if (
        !Number.isFinite(temperature) ||
        !Number.isFinite(humidity)
      ) {
        console.warn(
          "Invalid sensor reading:",
          data
        );

        return;
      }

      currentProject.climate = {
        temperature,
        humidity,
        status: "Live"
      };

      updateClimateDisplay(
        temperature,
        humidity,
        "Live"
      );

      scheduleSave();
    }
  };

  /* =========================================================
     PAGE CLEANUP
     ========================================================= */

  window.addEventListener(
    "beforeunload",
    () => {
      Object.keys(cameraStreams)
        .forEach(cameraNumber => {
          stopCamera(cameraNumber);
        });
    }
  );

  /* =========================================================
     INITIALIZE
     ========================================================= */

  async function init() {
    loadProject();

    if (!currentProject) {
      $("#project-editor").style.display =
        "none";

      $("#no-project-message").style.display =
        "block";

      return;
    }

    /*
      Make sure older projects that were
      created before this version don't crash.
    */

    currentProject.cameras =
      currentProject.cameras || {
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
      };

    currentProject.climate =
      currentProject.climate || {
        temperature: null,
        humidity: null,
        status: "Simulated"
      };

    currentProject.artifact =
      currentProject.artifact || {
        description: "",
        period: "",
        material: "",
        location: "",
        condition: "",
        notes: ""
      };

    loadProjectIntoPage();

    setupProjectName();

    setupCoverUpload();

    setupArtifactFields();

    /*
      Get camera information.
    */

    if (
      navigator.mediaDevices &&
      navigator.mediaDevices.enumerateDevices
    ) {
      await refreshCameraLists();
    }

    /*
      Start fake sensor readings.
    */

    startSimulatedSensor();
  }

  /*
    Wait until DOM is ready.
  */

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();
