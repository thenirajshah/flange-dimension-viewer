const NB_BY_INCH = {
  "1/2": "15", "3/4": "20", "1": "25", "1 1/4": "32",
  "1 1/2": "40", "2": "50", "2 1/2": "65", "3": "80",
  "3 1/2": "90", "4": "100", "5": "125", "6": "150",
  "8": "200", "10": "250", "12": "300", "14": "350",
  "16": "400", "18": "450", "20": "500", "22": "550", "24": "600"
};

const sizeSelect = document.getElementById("sizeSelect");
const classSelect = document.getElementById("classSelect");
const typeSelect = document.getElementById("typeSelect");
const searchInput = document.getElementById("searchInput");
const result = document.getElementById("result");

const COMMON_KEYS = [
  "outside_diameter_of_flange_O_mm",
  "thickness_of_flange_Q_mm",
  "diameter_of_raised_face_R_mm",
  "diameter_of_hub_E_mm",
  "diameter_of_bolt_circle_P_mm",
  "number_of_holes",
  "hole_size_H_mm"
];

const TYPE_KEYS = {
  wn: ["length_through_hub_Y_welding_neck_mm"],
  so: [
    "slipon_socket_weld_bore_diameter_B_mm",
    "length_through_hub_Y_slipon_screwed_socket_weld_mm",
    "depth_of_socket_D_mm"
  ],
  lj: [
    "lap_joint_bore_diameter_B_mm",
    "length_through_hub_Y_lap_joint_mm"
  ]
};

function showEmpty(title, description) {
  result.innerHTML = `<div class="empty"><b>${title}</b>${description}</div>`;
}

function getNB(size) {
  return NB_BY_INCH[size] || "—";
}

function initialize(DATA) {
  const sizes = [...new Set(
    [...DATA.classes["150"], ...DATA.classes["300"]]
      .map(row => row.nominal_pipe_size_in)
  )];

  sizeSelect.innerHTML = '<option value="">Select Size (Inch / NB)</option>';

  sizes.forEach(size => {
    const option = document.createElement("option");
    option.value = size;
    option.textContent = `${size}"  ·  ${getNB(size)} NB`;
    sizeSelect.appendChild(option);
  });

  function render() {
    const size = sizeSelect.value;
    const cls = classSelect.value;

    if (!size) {
      classSelect.disabled = true;
      classSelect.value = "";
      showEmpty("Flange size select karein", "Dimensions dekhne ke liye pehle size, phir class choose karein.");
      return;
    }

    classSelect.disabled = false;

    if (!cls) {
      showEmpty("Flange class select karein", "Ab Class 150 ya Class 300 choose karein.");
      return;
    }

    const row = (DATA.classes[cls] || []).find(
      item => item.nominal_pipe_size_in === size
    );

    if (!row) {
      showEmpty("Data available nahi hai", "Is size aur class ka record source mein nahi mila.");
      return;
    }

    let columns = DATA.columns.filter(column => column.key !== "nominal_pipe_size_in");
    const selectedType = typeSelect.value;

    if (selectedType !== "all") {
      const allowed = new Set([...COMMON_KEYS, ...TYPE_KEYS[selectedType]]);
      columns = columns.filter(column => allowed.has(column.key));
    }

    const query = searchInput.value.trim().toLowerCase();
    if (query) {
      columns = columns.filter(column => {
        const value = row[column.key] ?? "Not listed in source";
        return `${column.label} ${column.key} ${value}`.toLowerCase().includes(query);
      });
    }

    if (!columns.length) {
      showEmpty("Koi matching dimension nahi mili", "Search text ya flange type filter change karein.");
      return;
    }

    const cards = columns.map(column => {
      const value = row[column.key] === null || row[column.key] === undefined
        ? "Not listed in source"
        : row[column.key];
      const unit = column.unit === "count"
        ? ""
        : ` <span class="unit">${column.unit}</span>`;

      return `<div class="item">
        <div class="name">${column.label}</div>
        <div class="value">${value}${unit}</div>
      </div>`;
    }).join("");

    const warning = row.asterisk_marked || !row.ansi_b16_5_covered
      ? `<div class="notes warning"><strong>Source note:</strong> *${size}" is marked as not covered by ANSI B16.5.</div>`
      : "";

    const sourceNotes = `<div class="notes"><strong>Reference notes:</strong> 1.6 mm raised face is included in flange thickness and length. The marked dimension denotes pipe O.D. in welding neck flange.</div>`;

    result.innerHTML = `
      <div class="result-head">
        <div>
          <h2>${size}" · ${getNB(size)} NB Flange</h2>
          <div class="result-subtitle">${columns.length} dimensions shown</div>
        </div>
        <span class="pill">Class ${cls}</span>
      </div>
      <div class="grid">${cards}</div>
      ${warning}
      ${sourceNotes}
    `;
  }

  sizeSelect.addEventListener("change", () => {
    classSelect.value = "";
    render();
  });
  classSelect.addEventListener("change", render);
  typeSelect.addEventListener("change", render);
  searchInput.addEventListener("input", render);

  render();
}

fetch("./data.json")
  .then(response => {
    if (!response.ok) throw new Error("Could not load flange data");
    return response.json();
  })
  .then(initialize)
  .catch(error => {
    console.error(error);
    showEmpty("Data load nahi ho paya", "Page refresh karein ya internet connection check karein.");
  });
