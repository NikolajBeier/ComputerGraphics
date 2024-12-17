var canvas, gl;
var pointsArray = [];
var texCoordsArray = [];
var shadowPointsArray = [];
var program;

var texture0, texture1;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) alert("WebGL isn't available");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.53, 0.81, 0.92, 1.0); // Light blue background
    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    setupScene();
    setupBuffers();
    setupTextures();

    render();
};

function setupScene() {
    // Ground Quad
    quad(
        pointsArray,
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

    // Small Quad Above Ground
    quad(
        pointsArray,
        [
            vec4(0.25, -0.5, -1.25, 1.0),
            vec4(0.25, -0.5, -1.75, 1.0),
            vec4(0.75, -0.5, -1.75, 1.0),
            vec4(0.75, -0.5, -1.25, 1.0)
        ],
        Array(4).fill(vec2(0.0, 0.0))
    );

    // Standing Quad Perpendicular to Ground
    quad(
        pointsArray,
        [
            vec4(-1, -1, -2.5, 1.0),
            vec4(-1, 0, -2.5, 1.0),
            vec4(-1, 0, -3.0, 1.0),
            vec4(-1, -1, -3.0, 1.0)
        ],
        Array(4).fill(vec2(0.0, 0.0))
    );

    // Generate shadows
    let lightPos = vec4(0, 5, 2, 1);
    let Mp = shadowMatrix(lightPos, vec4(0, 1, 0, 1));

    generateShadowVertices([
        vec4(0.25, -0.5, -1.25, 1.0),
        vec4(0.25, -0.5, -1.75, 1.0),
        vec4(0.75, -0.5, -1.75, 1.0),
        vec4(0.75, -0.5, -1.25, 1.0)
    ], Mp);

    generateShadowVertices([
        vec4(-1, -1, -2.5, 1.0),
        vec4(-1, 0, -2.5, 1.0),
        vec4(-1, 0, -3.0, 1.0),
        vec4(-1, -1, -3.0, 1.0)
    ], Mp);
}

function shadowMatrix(lightPos, groundPlane) {
    let dotProduct = dot(lightPos, groundPlane);
    let shadowMat = mat4();

    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            shadowMat[i][j] = dotProduct - lightPos[i] * groundPlane[j];
        }
    }
    return shadowMat;
}

function generateShadowVertices(vertices, shadowMat) {
    for (let v of vertices) {
        let shadowVertex = mult(shadowMat, v);
        shadowPointsArray.push(shadowVertex);
    }
}

function quad(array, vertices, texCoords) {
    array.push(vertices[0], vertices[1], vertices[2], vertices[0], vertices[2], vertices[3]);
    if (texCoords.length > 0) {
        texCoordsArray.push(texCoords[0], texCoords[1], texCoords[2], texCoords[0], texCoords[2], texCoords[3]);
    }
}

function setupBuffers() {
    let buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray.concat(shadowPointsArray)), gl.STATIC_DRAW);

    let vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    let tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray.concat(Array(shadowPointsArray.length).fill(vec2(0.0, 0.0)))), gl.STATIC_DRAW);

    let vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);
}

function setupTextures() {
    texture0 = gl.createTexture();
    let image = new Image();
    image.onload = function () {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        render();
    };
    image.src = "../xamp23.png";

    texture1 = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 0, 255]));
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var eye = vec3(0.0, 1.0, 1.5);
    var at = vec3(0.0, 0.0, -2.5);
    var up = vec3(0.0, 1.0, 0.0);

    let modelViewMatrix = lookAt(eye, at, up);
    let projectionMatrix = perspective(45, canvas.width / canvas.height, 0.1, 100);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "modelViewMatrix"), false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"), false, flatten(projectionMatrix));

    // Draw ground quad
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture0);
    gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "isShadow"), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Draw shadows
    gl.disable(gl.DEPTH_TEST);
    gl.uniform1i(gl.getUniformLocation(program, "isShadow"), 1);
    gl.drawArrays(gl.TRIANGLES, pointsArray.length, shadowPointsArray.length);

    gl.enable(gl.DEPTH_TEST);

    // Draw red quads
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.uniform1i(gl.getUniformLocation(program, "texture"), 1);
    gl.uniform1i(gl.getUniformLocation(program, "isShadow"), 0);
    gl.drawArrays(gl.TRIANGLES, 6, 12);

    requestAnimationFrame(render);
}
