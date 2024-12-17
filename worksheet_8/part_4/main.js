var canvas, gl;
var program;

var pointsArray = [];
var texCoordsArray = [];

var texture0, texture1;

var time = 0.0;

var modelViewMatrixLoc, projectionMatrixLoc, isShadowLoc, visibilityLoc;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    // Disable browser compositing
    gl = WebGLUtils.setupWebGL(canvas, { alpha: false });
    if (!gl) alert("WebGL isn't available");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.53, 0.81, 0.92, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    setupScene();
    setupBuffers();
    setupTextures();

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    isShadowLoc = gl.getUniformLocation(program, "isShadow");
    visibilityLoc = gl.getUniformLocation(program, "visibility");

    render();
};

function setupScene() {
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

    quad(
        [
            vec4(0.25, -0.5, -1.25, 1.0),
            vec4(0.25, -0.5, -1.75, 1.0),
            vec4(0.75, -0.5, -1.75, 1.0),
            vec4(0.75, -0.5, -1.25, 1.0)
        ],
        Array(4).fill(vec2(0.0, 0.0))
    );

    quad(
        [
            vec4(-1, -1, -2.5, 1.0),
            vec4(-1, 0, -2.5, 1.0),
            vec4(-1, 0, -3.0, 1.0),
            vec4(-1, -1, -3.0, 1.0)
        ],
        Array(4).fill(vec2(0.0, 0.0))
    );
}

function quad(vertices, texCoords) {
    pointsArray.push(vertices[0], vertices[1], vertices[2], vertices[0], vertices[2], vertices[3]);
    texCoordsArray.push(texCoords[0], texCoords[1], texCoords[2], texCoords[0], texCoords[2], texCoords[3]);
}

function setupBuffers() {
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);

    var vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);
}

function setupTextures() {
    texture0 = gl.createTexture();
    var image = new Image();
    image.onload = function () {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
    };
    image.src = "../xamp23.png";

    texture1 = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 0, 255]));
}

function projectionMatrixOntoPlane(lightPos, planeY) {
    var Lx = lightPos[0];
    var Ly = lightPos[1];
    var Lz = lightPos[2];

    var denom = Ly + 1.0;
    var epsilon = 0.01;

    var M_p = mat4();
    M_p[0] = vec4(1.0, -Lx/denom, 0.0, -Lx/denom);
    M_p[1] = vec4(0.0,  1.0/denom,0.0, -Ly/denom);
    M_p[2] = vec4(0.0, -Lz/denom, 1.0, -Lz/denom);
    M_p[3] = vec4(0.0, -1.0/denom,0.0,  Ly/denom - epsilon);

    return M_p;
}

function drawShadows(modelViewMatrix, projectionMatrix, lightPos) {
    var M_p = projectionMatrixOntoPlane(lightPos, -1);
    var M_shadow = mult(modelViewMatrix, M_p);

    gl.depthFunc(gl.GREATER);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(M_shadow));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    gl.uniform1f(visibilityLoc, 0.5);
    gl.uniform1i(isShadowLoc, 1);

    gl.drawArrays(gl.TRIANGLES, 6, 12);

    gl.depthFunc(gl.LESS);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    time += 0.02;
    var Lx = 0 + 2 * Math.cos(time);
    var Ly = 2.0;
    var Lz = -2 + 2 * Math.sin(time);
    var lightPos = vec4(Lx, Ly, Lz, 1.0);

    var eye = vec3(0.0, 1.0, 1.5);
    var at = vec3(0.0, 0.0, -2.5);
    var up = vec3(0.0, 1.0, 0.0);

    var modelViewMatrix = lookAt(eye, at, up);
    var projectionMatrix = perspective(45, canvas.width / canvas.height, 0.1, 100);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
    gl.uniform1i(isShadowLoc, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture0);
    gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
    gl.uniform1f(visibilityLoc, 1.0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    drawShadows(modelViewMatrix, projectionMatrix, lightPos);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.uniform1i(gl.getUniformLocation(program, "texture"), 1);
    gl.uniform1f(visibilityLoc, 1.0);
    gl.uniform1i(isShadowLoc, 0);
    gl.drawArrays(gl.TRIANGLES, 6, 12);

    requestAnimationFrame(render);
}
