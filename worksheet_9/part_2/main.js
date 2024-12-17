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

var modelViewMatrixLocGround, projectionMatrixLocGround, isShadowLocGround, visibilityLocGround;

var modelViewMatrixLocTeapot, projectionMatrixLocTeapot, normalMatrixLocTeapot, lightDirectionLocTeapot;

var eye = vec3(0.0, 1.0, 1.5);
var at = vec3(0.0, 0.0, -2.5);
var up = vec3(0.0, 1.0, 0.0);

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
    isShadowLocGround = gl.getUniformLocation(programGround, "isShadow");
    visibilityLocGround = gl.getUniformLocation(programGround, "visibility");
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

function projectionMatrixOntoPlane(lightPos, planeY) {
    var Lx = lightPos[0];
    var Ly = lightPos[1];
    var Lz = lightPos[2];

    var denom = Ly + 1.0;
    var epsilon = 0.001;

    var M_p = mat4();
    M_p[0] = vec4(1.0, -Lx/denom, 0.0, -Lx/denom);
    M_p[1] = vec4(0.0,  1.0/denom,0.0, -Ly/denom);
    M_p[2] = vec4(0.0, -Lz/denom, 1.0, -Lz/denom);
    M_p[3] = vec4(0.0, -1.0/denom,0.0, Ly/denom - epsilon);

    return M_p;
}

function drawGroundObject(projectionMatrix, modelViewMatrix) {
    gl.useProgram(programGround);

    gl.uniformMatrix4fv(projectionMatrixLocGround, false, flatten(projectionMatrix));
    gl.uniformMatrix4fv(modelViewMatrixLocGround, false, flatten(modelViewMatrix));
    gl.uniform1i(isShadowLocGround, 0);
    gl.uniform1f(visibilityLocGround, 1.0);

    var vPosition = gl.getAttribLocation(programGround, "vPosition");
    initAttributeVariable(gl, vPosition, groundBuffer);

    var vTexCoord = gl.getAttribLocation(programGround, "vTexCoord");
    initAttributeVariable(gl, vTexCoord, groundTexBuffer);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture0);
    gl.uniform1i(gl.getUniformLocation(programGround, "texture"), 0);

    gl.depthFunc(gl.LESS);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function drawShadows(projectionMatrix, teapotMV, lightPos) {
    var M_p = projectionMatrixOntoPlane(lightPos, -1);
    var M_shadow = mult(teapotMV, M_p);

    gl.useProgram(programGround);

    gl.uniformMatrix4fv(projectionMatrixLocGround, false, flatten(projectionMatrix));
    gl.uniformMatrix4fv(modelViewMatrixLocGround, false, flatten(M_shadow));
    gl.uniform1i(isShadowLocGround, 1);
    gl.uniform1f(visibilityLocGround, 1.0);

    var vPosition = gl.getAttribLocation(programGround, "vPosition");
    initAttributeVariable(gl, vPosition, vBufferTeapot);

    var vTexCoord = gl.getAttribLocation(programGround, "vTexCoord");
    gl.disableVertexAttribArray(vTexCoord);

    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(-1.0, -1.0);

    gl.depthFunc(gl.GREATER);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBufferTeapot);
    var indexType = gl.getExtension('OES_element_index_uint') ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    gl.drawElements(gl.TRIANGLES, indicesTeapot, indexType, 0);

    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.depthFunc(gl.LESS);
}

function drawTeapotObject(projectionMatrix, teapotMV, lightPosEye) {
    if (!teapotLoaded) return;

    gl.useProgram(programTeapot);

    gl.uniformMatrix4fv(projectionMatrixLocTeapot, false, flatten(projectionMatrix));
    gl.uniformMatrix4fv(modelViewMatrixLocTeapot, false, flatten(teapotMV));

    var nMat = normalMatrix(teapotMV, true);
    gl.uniformMatrix3fv(normalMatrixLocTeapot, false, flatten(nMat));
    gl.uniform3fv(lightDirectionLocTeapot, flatten(lightPosEye));

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
    var Lx = 0 + 2 * Math.cos(time);
    var Ly = 3.0;
    var Lz = -2 + 2 * Math.sin(time);
    var lightPos = vec4(Lx, Ly, Lz, 1.0);

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

    var lightPosEye4 = mult(modelViewMatrix, lightPos);
    var lightPosEye = vec3(lightPosEye4[0], lightPosEye4[1], lightPosEye4[2]);

    drawGroundObject(projectionMatrix, modelViewMatrix);

    var teapotMV = mult(modelViewMatrix, translate(0, teapotY, -3));
    teapotMV = mult(teapotMV, scalem(0.25,0.25,0.25));

    drawShadows(projectionMatrix, teapotMV, lightPos);

    drawTeapotObject(projectionMatrix, teapotMV, normalize(lightPosEye));

    requestAnimationFrame(render);
}
