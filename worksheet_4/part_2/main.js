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

    render();
}

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
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    var modelViewMatrix = mat4();
    modelViewMatrix = mult(modelViewMatrix, translate(0, 0, -8));
    modelViewMatrix = mult(modelViewMatrix, rotateX(30));
    modelViewMatrix = mult(modelViewMatrix, rotateY(45));

    var modelViewMatrixAttrib = gl.getUniformLocation(program, "modelViewMatrix");
    gl.uniformMatrix4fv(modelViewMatrixAttrib, false, flatten(modelViewMatrix));

    gl.drawArrays(gl.TRIANGLES, 0, pointsArray.length);
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
    render();
}