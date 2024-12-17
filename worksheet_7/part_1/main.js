function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}

var canvas = document.getElementById("gl-canvas");

canvas.width = 512;
canvas.height = 512;
const gl = setupWebGL(canvas);

gl.enable(gl.DEPTH_TEST);
gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);

var pointsArray = [];
var normalsArray = [];
var index = 0;

const va = vec4(0.5, 0.5, 0.5, 1);
const vb = vec4(-0.5, -0.5, 0.5, 1);
const vc = vec4(0.5, -0.5, -0.5, 1);
const vd = vec4(-0.5, 0.5, -0.5, 1);
var subdivisions = 0;

var theta = 0; // Camera
var vBuffer, nBuffer, program, cubeMapTexture;

function initCubeMap() {
    var cubemap = ['../textures/cm_left.png',   // POSITIVE_X'textures
        '../textures/cm_right.png',   // NEGATIVE_X
        '../textures/cm_top.png',    // POSITIVE_Y
        '../textures/cm_bottom.png', // NEGATIVE_Y
        '../textures/cm_back.png',   // POSITIVE_Z
        '../textures/cm_front.png'];   // NEGATIVE

    gl.activeTexture(gl.TEXTURE0);
    var   texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    for  (var   i = 0; i < 6; ++i) {
        var   image = document.createElement('img');
        image.crossorigin = 'anonymous';
        image.textarget = gl.TEXTURE_CUBE_MAP_POSITIVE_X + i;
        image.onload = function(event){
            var   image = event.target;gl.activeTexture(gl.TEXTURE0);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(image.textarget, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
            ++g_tex_ready;
        };  image.src = cubemap[i];
    }

    return texture;
}

window.onload = function init() {
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    cubeMapTexture = initCubeMap();

    vBuffer = gl.createBuffer();
    nBuffer = gl.createBuffer();

    updateBuffers();

    const projectionMatrix = perspective(45, 1, 0.1, 10);
    const uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));

    render();
};

function updateBuffers() {
    pointsArray = [];
    normalsArray = [];
    index = 0;

    // Generate new tetrahedron
    tetrahedron(va, vb, vc, vd, subdivisions);

    // Bind and buffer vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    const vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Bind and buffer normals
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
    const vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    // Bind the cube map texture
    const uCubeMap = gl.getUniformLocation(program, "uCubeMap");
    gl.uniform1i(uCubeMap, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    theta += 0.01;
    const cameraRadius = 8.0;
    const eye = vec3(cameraRadius * Math.sin(theta), 0, cameraRadius * Math.cos(theta));
    const at = vec3(0, 0, 0);
    const up = vec3(0, 1, 0);

    const modelViewMatrix = lookAt(eye, at, up);

    const modelViewMatrixAttrib = gl.getUniformLocation(program, "modelViewMatrix");
    gl.uniformMatrix4fv(modelViewMatrixAttrib, false, flatten(modelViewMatrix));

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
        const ab = normalize(mix(a, b, 0.5), true);
        const ac = normalize(mix(a, c, 0.5), true);
        const bc = normalize(mix(b, c, 0.5), true);
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

    const normal = normalize(cross(subtract(b, a), subtract(c, a)));
    normalsArray.push(normal, normal, normal);

    index += 3;
}

function alterSubdivision(alteration) {
    subdivisions += alteration;
    if (subdivisions > 8) subdivisions = 8;
    if (subdivisions < 0) subdivisions = 0;
    updateBuffers();
}
