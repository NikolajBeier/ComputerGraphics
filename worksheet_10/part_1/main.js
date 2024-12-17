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
var subdivisions = 0;

var vBuffer, cBuffer;
var program;

window.onload = function init() {
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    vBuffer = gl.createBuffer();
    cBuffer = gl.createBuffer();

    updateBuffers();

    const projectionMatrix = perspective(45, 1, 0.1, 10);
    const uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));

    updateViewMatrix();

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

let isDragging = false;
let lastPos = null;
let rotationMatrix = mat4();

function getSpherePoint(x, y, width, height) {
    const nx = (2 * x - width) / width;
    const ny = (height - 2 * y) / height;
    const length = nx * nx + ny * ny;

    if (length <= 1) {
        return vec3(nx, ny, Math.sqrt(1 - length));
    } else {
        return normalize(vec3(nx, ny, 0));
    }
}

function computeRotationMatrix(start, end) {
    const axis = cross(start, end);
    const angle = Math.acos(Math.min(1, dot(normalize(start), normalize(end))));

    if (angle === 0 || isNaN(angle)) {
        return mat4();
    }

    return rotate(degrees(angle), axis);
}

function orthonormalize(mat) {
    let x = vec3(mat[0][0], mat[1][0], mat[2][0]);
    let y = vec3(mat[0][1], mat[1][1], mat[2][1]);
    let z = vec3(mat[0][2], mat[1][2], mat[2][2]);

    x = normalize(x);
    y = subtract(y, scale(dot(y, x), x));
    y = normalize(y);
    z = subtract(z, scale(dot(z, x), x), scale(dot(z, y), y));
    z = normalize(z);

    mat[0][0] = x[0]; mat[1][0] = x[1]; mat[2][0] = x[2]; mat[3][0] = 0;
    mat[0][1] = y[0]; mat[1][1] = y[1]; mat[2][1] = y[2]; mat[3][1] = 0;
    mat[0][2] = z[0]; mat[1][2] = z[1]; mat[2][2] = z[2]; mat[3][2] = 0;
    mat[0][3] = 0;    mat[1][3] = 0;    mat[2][3] = 0;    mat[3][3] = 1;

    return mat;
}

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

    if (lastPos) {
        const rotation = computeRotationMatrix(lastPos, currentPos);
        rotationMatrix = mult(rotation, rotationMatrix);

        rotationMatrix = orthonormalize(rotationMatrix);
    }

    lastPos = currentPos;
    updateViewMatrix();
};

function updateViewMatrix() {
    const eye = vec3(0, 0, 8);
    const at = vec3(0, 0, 0);
    const up = vec3(0, 1, 0);

    const modelViewMatrix = mult(lookAt(eye, at, up), rotationMatrix);
    const modelViewMatrixAttrib = gl.getUniformLocation(program, "modelViewMatrix");
    gl.uniformMatrix4fv(modelViewMatrixAttrib, false, flatten(modelViewMatrix));
}

function degrees(radians) {
    return radians * (180 / Math.PI);
}
