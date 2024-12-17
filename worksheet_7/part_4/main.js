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
var texCoordsArray = [];
var index = 0;

const va = vec4(0.5, 0.5, 0.5, 1);
const vb = vec4(-0.5, -0.5, 0.5, 1);
const vc = vec4(0.5, -0.5, -0.5, 1);
const vd = vec4(-0.5, 0.5, -0.5, 1);
var subdivisions = 0;

var theta = 0;
var program;
var cubeMapTexture;
var normalMapTexture;


var vBuffer, nBuffer, tBuffer;

var bgBuffer;
var bgVertices = [
    vec4(-1, -1, 0.999, 1),
    vec4(1, -1, 0.999, 1),
    vec4(1, 1, 0.999, 1),
    vec4(-1, 1, 0.999, 1)
];

function initCubeMap() {
    var cubemap = [
        '../textures/cm_left.png',   // POSITIVE_X
        '../textures/cm_right.png',  // NEGATIVE_X
        '../textures/cm_top.png',    // POSITIVE_Y
        '../textures/cm_bottom.png', // NEGATIVE_Y
        '../textures/cm_back.png',   // POSITIVE_Z
        '../textures/cm_front.png'   // NEGATIVE_Z
    ];

    gl.activeTexture(gl.TEXTURE0);
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    for (var i = 0; i < 6; ++i) {
        var image = new Image();
        image.crossorigin = 'anonymous';
        image.textarget = gl.TEXTURE_CUBE_MAP_POSITIVE_X + i;
        image.onload = function(event) {
            var img = event.target;
            gl.activeTexture(gl.TEXTURE0);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(img.textarget, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        };
        image.src = cubemap[i];
    }
    return texture;
}

function initNormalMap() {
    gl.activeTexture(gl.TEXTURE1);
    normalMapTexture = gl.createTexture();
    var image = new Image();
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, normalMapTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    };
    image.src = "../textures/normalmap.png";
}

window.onload = function init() {
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    cubeMapTexture = initCubeMap();
    initNormalMap();

    vBuffer = gl.createBuffer();
    nBuffer = gl.createBuffer();
    tBuffer = gl.createBuffer();

    updateBuffers();

    bgBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bgBuffer);
    var bgQuad = [
        bgVertices[0], bgVertices[1], bgVertices[2],
        bgVertices[0], bgVertices[2], bgVertices[3]
    ];
    gl.bufferData(gl.ARRAY_BUFFER, flatten(bgQuad), gl.STATIC_DRAW);

    const uCubeMap = gl.getUniformLocation(program, "uCubeMap");
    gl.uniform1i(uCubeMap, 0);

    const uNormalMap = gl.getUniformLocation(program, "uNormalMap");
    gl.uniform1i(uNormalMap, 1);

    render();
};

function updateBuffers() {
    pointsArray = [];
    normalsArray = [];
    texCoordsArray = [];
    index = 0;

    tetrahedron(va, vb, vc, vd, subdivisions);

    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    const vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
    const vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);
    const vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    theta += 0.01;
    const cameraRadius = 8.0;
    const eye = vec3(cameraRadius * Math.sin(theta), 0, cameraRadius * Math.cos(theta));
    const at = vec3(0, 0, 0);
    const up = vec3(0, 1, 0);

    const projectionMatrix = perspective(45, 1, 0.1, 10);
    const modelViewMatrix = lookAt(eye, at, up);

    var R = mat4(modelViewMatrix[0],
        modelViewMatrix[1],
        modelViewMatrix[2],
        vec4(0,0,0,1));
    var invR = inverse(R);
    var invP = inverse(projectionMatrix);
    var Mtex_background = mult(invR, invP);

    const modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    const uProjectionMatrixLoc = gl.getUniformLocation(program, "uProjectionMatrix");
    const MtexLoc = gl.getUniformLocation(program, "Mtex");
    const uIsBackgroundLoc = gl.getUniformLocation(program, "uIsBackground");
    const uReflectiveLoc = gl.getUniformLocation(program, "uReflective");
    const uUseNormalMapLoc = gl.getUniformLocation(program, "uUseNormalMap");
    const uEyePosLoc = gl.getUniformLocation(program, "uEyePos");

    gl.uniform3fv(uEyePosLoc, flatten(eye));

    gl.bindBuffer(gl.ARRAY_BUFFER, bgBuffer);
    const vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    const vNormal = gl.getAttribLocation(program, "vNormal");
    gl.disableVertexAttribArray(vNormal);

    const vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.disableVertexAttribArray(vTexCoord);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mat4()));
    gl.uniformMatrix4fv(uProjectionMatrixLoc, false, flatten(mat4()));
    gl.uniformMatrix4fv(MtexLoc, false, flatten(Mtex_background));
    gl.uniform1i(uIsBackgroundLoc, true);
    gl.uniform1i(uReflectiveLoc, false);
    gl.uniform1i(uUseNormalMapLoc, false);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(uProjectionMatrixLoc, false, flatten(projectionMatrix));
    gl.uniformMatrix4fv(MtexLoc, false, flatten(mat4())); // identity
    gl.uniform1i(uIsBackgroundLoc, false);
    gl.uniform1i(uReflectiveLoc, true);
    gl.uniform1i(uUseNormalMapLoc, true);

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

    texCoordsArray.push(sphericalUV(vec3(a[0], a[1], a[2])));
    texCoordsArray.push(sphericalUV(vec3(b[0], b[1], b[2])));
    texCoordsArray.push(sphericalUV(vec3(c[0], c[1], c[2])));

    index += 3;
}

function sphericalUV(pos) {
    var x = pos[0], y = pos[1], z = pos[2];
    var radius = length(pos);
    var theta = Math.atan2(z, x);
    var phi = Math.asin(y/radius);
    var u = 0.5 + (theta/(2.0*Math.PI));
    var v = 0.5 - (phi/Math.PI);
    return vec2(u, v);
}

function alterSubdivision(alteration) {
    subdivisions += alteration;
    if (subdivisions > 8) subdivisions = 8;
    if (subdivisions < 0) subdivisions = 0;
    updateBuffers();
}
