/**
 * @param {Element} canvas. The canvas element to create a context from.
 * @return {WebGLRenderingContext} The created context.
 */
function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}


var canvas = document.getElementById("gl-canvas");



canvas.width = 512;//window.innerWidth;
canvas.height = 512//window.innerHeight;
const gl = setupWebGL(canvas);

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.cullFace(gl.BACK);
gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);


var pointsArray = [];
var colorsArray = [];
var normalsArray = [];
var index = 0;

const va = vec4(0.5, 0.5, 0.5, 1);
const vb = vec4(-0.5, -0.5, 0.5, 1);
const vc = vec4(0.5, -0.5, -0.5, 1);
const vd = vec4(-0.5, 0.5, -0.5, 1);
var subdivisions = 0;

var theta = 0; //Camera

var vBuffer, cBuffer, nBuffer;
var program;

var lightDirection = vec3(0.0, 0.0, -1.0);
var ambientProduct = vec4(0.2, 0.2, 0.2, 1.0);
var diffuseProduct = vec4(1.0, 1.0, 1.0, 1.0);
var specularProduct = vec4(1.0, 1.0, 1.0, 1.0);
var shininess = 50.0;

window.onload = function init() {
    // Load shaders and initialize attribute buffers
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    vBuffer = gl.createBuffer();
    cBuffer = gl.createBuffer();
    nBuffer = gl.createBuffer();

    updateBuffers();

    const projectionMatrix = perspective(45, 1, 0.1, 10);
    const uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));

    gl.uniform3fv(gl.getUniformLocation(program, "lightDirection"), flatten(lightDirection));
    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), shininess);

    setLightingUniforms();

    setupSliders();

    render();
}

function setupSliders() {
    document.getElementById("ambient-slider").addEventListener("input", function (e) {
        var value = parseFloat(e.target.value);
        ambientProduct = vec4(value, value, value, 1.0);
        gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
    });

    document.getElementById("diffuse-slider").addEventListener("input", function (e) {
        var value = parseFloat(e.target.value);
        diffuseProduct = vec4(value, value, value, 1.0);
        gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct));
    });

    document.getElementById("specular-slider").addEventListener("input", function (e) {
        var value = parseFloat(e.target.value);
        specularProduct = vec4(value, value, value, 1.0);
        gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
    });

    document.getElementById("shininess-slider").addEventListener("input", function (e) {
        shininess = parseFloat(e.target.value);
        gl.uniform1f(gl.getUniformLocation(program, "shininess"), shininess);
    });
}
function setLightingUniforms() {
    gl.uniform3fv(gl.getUniformLocation(program, "lightDirection"), flatten(lightDirection));
    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), shininess);
}

function updateBuffers() {
    pointsArray = [];
    normalsArray = [];
    index = 0;

    tetrahedron(va, vb, vc, vd, subdivisions);

    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    const vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    theta += 0.01;
    const cameraRadius = 8.0;
    const eye = vec3(cameraRadius * Math.sin(theta), 0, cameraRadius * Math.cos(theta));
    const at = vec3(0, 0, 0);
    const up = vec3(0, 1, 0);

    var modelViewMatrix = lookAt(eye, at, up);
    var modelViewMatrixAttrib = gl.getUniformLocation(program, "modelViewMatrix");
    gl.uniformMatrix4fv(modelViewMatrixAttrib, false, flatten(modelViewMatrix));

    gl.drawArrays(gl.TRIANGLES, 0, pointsArray.length);
    requestAnimationFrame(render);
}

function tetrahedron(a, b, c, d, n){
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

function triangle(a, b, c){
    pointsArray.push(a);
    pointsArray.push(b);
    pointsArray.push(c);

    colorsArray.push(vec4(0.5 * a[0] + 0.5, 0.5 * a[1] + 0.5, 0.5 * a[2] + 0.5, 1.0));
    colorsArray.push(vec4(0.5 * b[0] + 0.5, 0.5 * b[1] + 0.5, 0.5 * b[2] + 0.5, 1.0));
    colorsArray.push(vec4(0.5 * c[0] + 0.5, 0.5 * c[1] + 0.5, 0.5 * c[2] + 0.5, 1.0));

    index += 3;
}

function alterSubdivision(alteration){
    subdivisions += alteration;
    if (subdivisions > 10) subdivisions = 10;
    if (subdivisions < 0) subdivisions = 0;
    updateBuffers();
}