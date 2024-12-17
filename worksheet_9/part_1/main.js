var canvas, gl;

var programGround, programTeapot;

var groundPoints = [];
var groundTexCoords = [];
var groundBuffer = {}, groundTexBuffer = {};
var texture0;

var vBufferTeapot = {}, nBufferTeapot = {};
var iBufferTeapot;
var indicesTeapot = 0;
var teapotLoaded = false;

var teapotMotionOn = true;
var lightMotionOn = true;
var goingUp = true;
var teapotY = -1.0;
var time = 0.0;

var modelViewMatrixLocGround, projectionMatrixLocGround;
var modelViewMatrixLocTeapot, projectionMatrixLocTeapot, normalMatrixLocTeapot, lightDirectionLocTeapot;

var eye = vec3(0.0, 1.0, 1.5);
var at = vec3(0.0, 0.0, -2.5);
var up = vec3(0.0, 1.0, 0.0);

var lightDir = vec3(0.0, 1.0, 0.0);

function initAttributeVariable(gl, attribute, bufferObj) {
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferObj.buffer);
    gl.vertexAttribPointer(attribute, bufferObj.num, bufferObj.type, false, 0, 0);
    gl.enableVertexAttribArray(attribute);
}

window.onload = async function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas, { alpha: false });
    if (!gl) alert("WebGL isn't available");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.53, 0.81, 0.92, 1.0);
    gl.enable(gl.DEPTH_TEST);

    document.getElementById("toggleTeapotMotion").onclick = () => {
        teapotMotionOn = !teapotMotionOn;
    };
    document.getElementById("toggleLightMotion").onclick = () => {
        lightMotionOn = !lightMotionOn;
    };

    programGround = initShaders(gl, "vertex-shader-ground", "fragment-shader-ground");
    modelViewMatrixLocGround = gl.getUniformLocation(programGround, "modelViewMatrix");
    projectionMatrixLocGround = gl.getUniformLocation(programGround, "projectionMatrix");

    setupGround();
    setupGroundBuffers();
    setupTextures();

    programTeapot = initShaders(gl, "vertex-shader-teapot", "fragment-shader-teapot");
    modelViewMatrixLocTeapot = gl.getUniformLocation(programTeapot, "modelViewMatrix");
    projectionMatrixLocTeapot = gl.getUniformLocation(programTeapot, "projectionMatrix");
    normalMatrixLocTeapot = gl.getUniformLocation(programTeapot, "normalMatrix");
    lightDirectionLocTeapot = gl.getUniformLocation(programTeapot, "lightDirection");

    await loadTeapot();

    render();
};

function setupGround() {
    quad(
        [
            vec4(-2, -1, -1, 1.0),
            vec4(-2, -1, -5, 1.0),
            vec4(2, -1, -5, 1.0),
            vec4(2, -1, -1, 1.0)
        ],
        [
            vec2(0.0, 0.0),
            vec2(0.0, 1.0),
            vec2(1.0, 1.0),
            vec2(1.0, 0.0)
        ]
    );
}

function quad(vertices, texCoords) {
    groundPoints.push(vertices[0], vertices[1], vertices[2], vertices[0], vertices[2], vertices[3]);
    groundTexCoords.push(texCoords[0], texCoords[1], texCoords[2], texCoords[0], texCoords[2], texCoords[3]);
}

function setupGroundBuffers() {
    groundBuffer.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffer.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(groundPoints), gl.STATIC_DRAW);
    groundBuffer.num = 4;
    groundBuffer.type = gl.FLOAT;

    groundTexBuffer.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, groundTexBuffer.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(groundTexCoords), gl.STATIC_DRAW);
    groundTexBuffer.num = 2;
    groundTexBuffer.type = gl.FLOAT;
}

function setupTextures() {
    texture0 = gl.createTexture();
    var image = new Image();
    image.onload = function() {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
    };
    image.src = "../xamp23.png";
}

async function loadTeapot() {
    var drawingInfo = await readOBJFile("../teapot.obj", 1.0, false);
    if (!drawingInfo) {
        alert('Failed to load OBJ file.');
        return;
    }

    var numVertices = drawingInfo.vertices.length / 4;
    var normals3 = new Float32Array(numVertices * 3);
    for (var i = 0; i < numVertices; i++) {
        normals3[i*3+0] = drawingInfo.normals[i*4+0];
        normals3[i*3+1] = drawingInfo.normals[i*4+1];
        normals3[i*3+2] = drawingInfo.normals[i*4+2];
    }

    vBufferTeapot.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBufferTeapot.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);
    vBufferTeapot.num = 4;
    vBufferTeapot.type = gl.FLOAT;

    nBufferTeapot.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBufferTeapot.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals3, gl.STATIC_DRAW);
    nBufferTeapot.num = 3;
    nBufferTeapot.type = gl.FLOAT;

    iBufferTeapot = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBufferTeapot);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);

    indicesTeapot = drawingInfo.indices.length;
    teapotLoaded = true;
}

function drawGroundObject(projectionMatrix, modelViewMatrix) {
    gl.useProgram(programGround);

    gl.uniformMatrix4fv(projectionMatrixLocGround, false, flatten(projectionMatrix));
    gl.uniformMatrix4fv(modelViewMatrixLocGround, false, flatten(modelViewMatrix));

    var vPosition = gl.getAttribLocation(programGround, "vPosition");
    initAttributeVariable(gl, vPosition, groundBuffer);

    var vTexCoord = gl.getAttribLocation(programGround, "vTexCoord");
    initAttributeVariable(gl, vTexCoord, groundTexBuffer);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture0);
    gl.uniform1i(gl.getUniformLocation(programGround, "texture"), 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function drawTeapotObject(projectionMatrix, teapotMV) {
    if (!teapotLoaded) return;

    gl.useProgram(programTeapot);

    gl.uniformMatrix4fv(projectionMatrixLocTeapot, false, flatten(projectionMatrix));
    gl.uniformMatrix4fv(modelViewMatrixLocTeapot, false, flatten(teapotMV));

    // Use MV.js normalMatrix function
    var nMat = normalMatrix(teapotMV, true);
    gl.uniformMatrix3fv(normalMatrixLocTeapot, false, flatten(nMat));
    gl.uniform3fv(lightDirectionLocTeapot, flatten(lightDir));

    var vPosition = gl.getAttribLocation(programTeapot, "vPosition");
    initAttributeVariable(gl, vPosition, vBufferTeapot);

    var vNormal = gl.getAttribLocation(programTeapot, "vNormal");
    initAttributeVariable(gl, vNormal, nBufferTeapot);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBufferTeapot);
    var indexType = gl.getExtension('OES_element_index_uint') ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    gl.drawElements(gl.TRIANGLES, indicesTeapot, indexType, 0);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (lightMotionOn) time += 0.02;
    var Lx = 2 * Math.cos(time);
    var Ly = 2.0;
    var Lz = -2 + 2 * Math.sin(time);

    if (teapotMotionOn) {
        if (goingUp) {
            teapotY += 0.005;
            if (teapotY > 0.5) goingUp = false;
        } else {
            teapotY -= 0.005;
            if (teapotY < -1.0) goingUp = true;
        }
    }

    var modelViewMatrix = lookAt(eye, at, up);
    var projectionMatrix = perspective(45, canvas.width / canvas.height, 0.1, 100);

    // Draw ground
    drawGroundObject(projectionMatrix, modelViewMatrix);

    // Teapot model matrix: translate and scale
    var teapotMV = mult(modelViewMatrix, translate(0, teapotY, -3));
    teapotMV = mult(teapotMV, scalem(0.25,0.25,0.25));

    // Draw teapot
    drawTeapotObject(projectionMatrix, teapotMV);

    requestAnimationFrame(render);
}
