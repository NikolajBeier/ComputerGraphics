/**
 * @param {Element} canvas The canvas element to create a context from.
 * @return {WebGLRenderingContext} The created context.
 */
function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}

var canvas = document.getElementById("gl-canvas");

canvas.width = 512;
canvas.height = 512;
const gl = setupWebGL(canvas);

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.cullFace(gl.BACK);
gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);

var pointsArray = [];
var index = 0;

const va = vec4(0.5, 0.5, 0.5, 1);
const vb = vec4(-0.5, -0.5, 0.5, 1);
const vc = vec4(0.5, -0.5, -0.5, 1);
const vd = vec4(-0.5, 0.5, -0.5, 1);
var subdivisions = 5;

var theta = 0;
var vBuffer;
var program;

window.onload = function init() {
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    vBuffer = gl.createBuffer();

    updateBuffers();

    const projectionMatrix = perspective(90, 1, 0.1, 10);
    const uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));

    const texture = gl.createTexture();
    const earthImage = new Image();
    earthImage.src = "earth.jpg";
    earthImage.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, earthImage);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.generateMipmap(gl.TEXTURE_2D);

        const uTexture = gl.getUniformLocation(program, "earthTexture");
        gl.uniform1i(uTexture, 0);

        render();
    };
};

function updateBuffers() {
    pointsArray = [];
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

    theta += 0.5;

    const rotationMatrix = rotateY(theta);

    const cameraRadius = 2.0;
    const eye = vec3(0.0, 0.0, cameraRadius);
    const at = vec3(0, 0, 0);
    const up = vec3(0, 1, 0);

    const viewMatrix = lookAt(eye, at, up);

    const modelViewMatrix = mult(viewMatrix, rotationMatrix);

    const normalMat = normalMatrix(modelViewMatrix, true);

    const uModelViewMatrix = gl.getUniformLocation(program, "modelViewMatrix");
    gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(modelViewMatrix));

    const uNormalMatrix = gl.getUniformLocation(program, "normalMatrix");
    gl.uniformMatrix3fv(uNormalMatrix, false, flatten(normalMat));

    const lightDirWorld = vec3(0.0, 0.0, 1);

    const inverseRotationMatrix = rotateY(-theta);
    const rotatedLightDirModel = multMV(inverseRotationMatrix, vec4(lightDirWorld, 0.0)).slice(0, 3);

    const lightDirEye = normalize(multMV(viewMatrix, vec4(rotatedLightDirModel, 0.0)).slice(0, 3));

    const uLightDir = gl.getUniformLocation(program, "lightDir");
    gl.uniform3fv(uLightDir, flatten(lightDirEye));

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
    index += 3;
}

function alterSubdivision(alteration) {
    subdivisions += alteration;
    if (subdivisions > 10) subdivisions = 10;
    if (subdivisions < 0) subdivisions = 0;
    updateBuffers();
}

function multMV(matrix, vector) {
    var result = [];
    for (var i = 0; i < 4; ++i) {
        result.push(
            matrix[0][i] * vector[0] +
            matrix[1][i] * vector[1] +
            matrix[2][i] * vector[2] +
            matrix[3][i] * vector[3]
        );
    }
    return result;
}
