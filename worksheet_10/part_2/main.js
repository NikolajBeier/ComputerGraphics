/**
 * @param {Element} canvas. The canvas element to create a context from.
 * @return {WebGLRenderingContext} The created context.
 */
function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}

var canvas = document.getElementById("gl-canvas");

canvas.width = 512; // window.innerWidth;
canvas.height = 512; // window.innerHeight;
const gl = setupWebGL(canvas);

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.cullFace(gl.BACK);
gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);

var pointsArray = [];
var colorsArray = [];
var index = 0;

const va = vec4(0.5, 0.5, 0.5, 1);
const vb = vec4(-0.5, -0.5, 0.5, 1);
const vc = vec4(0.5, -0.5, -0.5, 1);
const vd = vec4(-0.5, 0.5, -0.5, 1);
var subdivisions = 4; // Adjust as needed for sphere smoothness

var vBuffer, cBuffer;
var program;

// Variables for trackball interaction
let isDragging = false;
let lastPos = null; // Last mouse position on the virtual sphere
let rotationQuat = new Quaternion(); // Accumulated rotation quaternion

window.onload = function init() {
    // Load shaders and initialize attribute buffers
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    vBuffer = gl.createBuffer();
    cBuffer = gl.createBuffer();

    updateBuffers();

    const projectionMatrix = perspective(45, 1, 0.1, 10);
    const uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));

    updateViewMatrix(); // Set initial view matrix

    render();
};

function updateBuffers() {
    pointsArray = [];
    colorsArray = [];
    index = 0;

    // Generate new tetrahedron
    tetrahedron(va, vb, vc, vd, subdivisions);

    // Bind and buffer vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    const vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Bind and buffer colors
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW);
    const vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLES, 0, pointsArray.length);
    requestAnimationFrame(render);
}

function tetrahedron(a, b, c, d, n) {
    divideTriangle(a, b, c, n);
    divideTriangle(d, c, b, n);
    divideTriangle(a, d, b, n);
    divideTriangle(a, c, d, n);
}

function divideTriangle(a, b, c, count) {
    if (count > 0) {
        var ab = normalize(mix(a, b, 0.5), true);
        var ac = normalize(mix(a, c, 0.5), true);
        var bc = normalize(mix(b, c, 0.5), true);
        divideTriangle(a, ab, ac, count - 1);
        divideTriangle(ab, b, bc, count - 1);
        divideTriangle(bc, c, ac, count - 1);
        divideTriangle(ab, bc, ac, count - 1);
    } else {
        triangle(a, b, c);
    }
}

function triangle(a, b, c) {
    pointsArray.push(a);
    pointsArray.push(b);
    pointsArray.push(c);

    colorsArray.push(vec4(0.5 * a[0] + 0.5, 0.5 * a[1] + 0.5, 0.5 * a[2] + 0.5, 1.0));
    colorsArray.push(vec4(0.5 * b[0] + 0.5, 0.5 * b[1] + 0.5, 0.5 * b[2] + 0.5, 1.0));
    colorsArray.push(vec4(0.5 * c[0] + 0.5, 0.5 * c[1] + 0.5, 0.5 * c[2] + 0.5, 1.0));

    index += 3;
}

function alterSubdivision(alteration) {
    subdivisions += alteration;
    if (subdivisions > 10) subdivisions = 10;
    if (subdivisions < 0) subdivisions = 0;
    updateBuffers();
}

// Map screen coordinates to a virtual sphere
function getSpherePoint(x, y, width, height) {
    let nx = (2 * x - width) / width; // Normalized x (-1 to 1)
    let ny = (height - 2 * y) / height; // Normalized y (-1 to 1)
    const length = nx * nx + ny * ny;

    let nz;
    if (length <= 1) {
        nz = Math.sqrt(1 - length);
    } else {
        const norm = Math.sqrt(length);
        nx /= norm;
        ny /= norm;
        nz = 0;
    }
    return vec3(nx, ny, nz);
}

// Mouse events
canvas.onmousedown = function (event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    lastPos = getSpherePoint(x, y, canvas.width, canvas.height);
    isDragging = true;
};

canvas.onmouseup = function () {
    isDragging = false;
    lastPos = null;
};

canvas.onmousemove = function (event) {
    if (!isDragging) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const currentPos = getSpherePoint(x, y, canvas.width, canvas.height);

    // Calculate rotation quaternion and accumulate it
    if (lastPos) {
        const axis = cross(lastPos, currentPos);
        const dotProduct = dot(normalize(lastPos), normalize(currentPos));
        // Clamp dotProduct to avoid NaN due to floating-point errors
        const clampedDot = Math.min(1.0, Math.max(-1.0, dotProduct));
        const angle = Math.acos(clampedDot);
        if (!isNaN(angle) && angle !== 0) {
            const rotQuat = new Quaternion();
            rotQuat.make_rot_angle_axis(angle, axis);

            // Accumulate the rotation (note the order)
            rotationQuat = rotQuat.multiply(rotationQuat);
        }
    }

    lastPos = currentPos;
    updateViewMatrix();
};

// Update view matrix with rotation
function updateViewMatrix() {
    const eye = vec3(0, 0, 8);
    const at = vec3(0, 0, 0);
    const up = vec3(0, 1, 0);

    const viewMatrix = lookAt(eye, at, up);

    // Convert quaternion to rotation matrix
    const rotationMatrix = rotationQuat.get_mat4();

    // Apply rotation to the model-view matrix
    const modelViewMatrix = mult(viewMatrix, rotationMatrix);
    const modelViewMatrixAttrib = gl.getUniformLocation(program, "modelViewMatrix");
    gl.uniformMatrix4fv(modelViewMatrixAttrib, false, flatten(modelViewMatrix));
}

// Convert radians to degrees
function degrees(radians) {
    return radians * (180 / Math.PI);
}
