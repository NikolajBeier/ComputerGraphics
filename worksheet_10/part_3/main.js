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
var subdivisions = 4;

var vBuffer, cBuffer;
var program;

let mode = 'orbit';

let isDragging = false;
let lastPos = null;
let lastSpherePos = null;
let rotationQuat = new Quaternion();
let panX = 0;
let panY = 0;
let distance = 8;

window.onload = function init() {
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    vBuffer = gl.createBuffer();
    cBuffer = gl.createBuffer();

    updateBuffers();

    const projectionMatrix = perspective(45, 1, 0.1, 100);
    const uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));

    updateViewMatrix();

    document.getElementById('orbitButton').onclick = function() {
        mode = 'orbit';
    };

    document.getElementById('dollyButton').onclick = function() {
        mode = 'dolly';
    };

    document.getElementById('panButton').onclick = function() {
        mode = 'pan';
    };

    canvas.onmousedown = function (event) {
        isDragging = true;
        lastPos = getMousePosition(event);

        if (mode === 'orbit') {
            lastSpherePos = getSpherePoint(lastPos.x, lastPos.y, canvas.width, canvas.height);
        }
    };

    canvas.onmouseup = function () {
        isDragging = false;
        lastPos = null;
        lastSpherePos = null;
    };

    canvas.onmousemove = function (event) {
        if (!isDragging) return;

        const currentPos = getMousePosition(event);

        if (mode === 'orbit') {
            // Orbit
            const currentSpherePos = getSpherePoint(currentPos.x, currentPos.y, canvas.width, canvas.height);

            const axis = cross(lastSpherePos, currentSpherePos);
            const dotProduct = dot(normalize(lastSpherePos), normalize(currentSpherePos));
            const clampedDot = Math.min(1.0, Math.max(-1.0, dotProduct));
            const angle = Math.acos(clampedDot);
            if (!isNaN(angle) && angle !== 0) {
                const rotQuat = new Quaternion();
                rotQuat.make_rot_angle_axis(angle, axis);

                rotationQuat = rotQuat.multiply(rotationQuat);
            }

            lastSpherePos = currentSpherePos;
        } else if (mode === 'dolly') {
            // Dolly mode
            const deltaY = currentPos.y - lastPos.y;
            const dollyScale = 0.05;
            distance += deltaY * dollyScale;

            distance = Math.max(1.0, Math.min(100.0, distance));
        } else if (mode === 'pan') {
            // Pan mode
            const deltaX = currentPos.x - lastPos.x;
            const deltaY = currentPos.y - lastPos.y;
            const panScale = 0.005;

            panX += -deltaX * panScale;
            panY += deltaY * panScale;
        }

        lastPos = currentPos;
        updateViewMatrix();
    };

    render();
};

function updateBuffers() {
    pointsArray = [];
    colorsArray = [];
    index = 0;

    tetrahedron(va, vb, vc, vd, subdivisions);

    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    const vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

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

function getMousePosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function getSpherePoint(x, y, width, height) {
    let nx = (2 * x - width) / width;
    let ny = (height - 2 * y) / height;
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

function updateViewMatrix() {
    const at = vec3(panX, panY, 0);
    const eye = vec3(panX, panY, distance);
    const up = vec3(0, 1, 0);

    const viewMatrix = lookAt(eye, at, up);

    const rotationMatrix = rotationQuat.get_mat4();

    const modelViewMatrix = mult(viewMatrix, rotationMatrix);

    const modelViewMatrixAttrib = gl.getUniformLocation(program, "modelViewMatrix");
    gl.uniformMatrix4fv(modelViewMatrixAttrib, false, flatten(modelViewMatrix));
}
