let displayUV = false;
let uvInverted = false;



document.getElementById("toggleMode").addEventListener("click", function () {
    wireframeOn = !wireframeOn;
    this.innerText = wireframeOn ? "Use MatCap" : "Use Wireframe";
});

document.getElementById("uv-toggle").addEventListener("click", function () {
    displayUV = !displayUV;
    gl.uniform1i(uvDisplayLoc, displayUV);
});

document.getElementById("uv-invert").addEventListener("click", function () {
    uvInverted = !uvInverted;
    gl.uniform1i(uvInvertedLoc, uvInverted);
    this.innerText = uvInverted ? "Use Normal UV" : "Use Corrected UV";
});

var slider = document.getElementById('damping-range');
slider.addEventListener('change', () => {
    dampingFactor = slider.value;
});

document.getElementById('bg-color-picker').addEventListener('input', (color) => {
    document.body.style.backgroundColor = color.target.value;
    const [r, g, b, a] = hexToRgb(color.target.value);

    gl.clearColor(r, g, b, a);
})

canvas.oncontextmenu = function(event) { event.preventDefault(); };

function hexToRgb(hex) {
    hex = hex.replace('#', '');

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return [r / 255, g / 255, b / 255, 1.0];
}

function DisplayPopUp(type) {
    HideOthers(type);
    let object = document.getElementById(type + "-popup");
    if(object.style.visibility === "visible") {
        object.style.visibility = "hidden";
    } else {
        object.style.visibility = "visible";
    }
}

function HideOthers(type) {
    if(type !== "matcaps") { document.getElementById('matcaps-popup').style.visibility = 'hidden'; }
    if(type !== "models") {document.getElementById('models-popup').style.visibility = 'hidden'; }
    if(type !== "settings") {document.getElementById('settings-popup').style.visibility = 'hidden'; }
    if(type !== "custom-matcap") { document.getElementById('custom-matcap-popup').style.visibility = 'hidden'; }
}

document.getElementById("fileInput").addEventListener("change", function (event) {
    const file = event.target.files[0];

    // Validate the file type
    if (!file || !file.type.startsWith("image/")) {
        alert("Please upload an image file.");
        return;
    }

    // Generate a URL for the uploaded file
    const fileURL = URL.createObjectURL(file);

    // Call the function with the file URL
    setupMatcapTexture(fileURL);

    // Revoke the object URL when done (optional, but recommended)
    event.target.addEventListener("change", () => URL.revokeObjectURL(fileURL), { once: true });
});