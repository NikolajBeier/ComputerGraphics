function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}

var canvas = document.getElementById("gl-canvas");
const gl = setupWebGL(canvas);

if (!gl) {
    alert("WebGL isn't available");
}

var ext = gl.getExtension('OES_element_index_uint');
if (!ext) {
    console.log('Warning: OES_element_index_uint extension not available. Falling back to UNSIGNED_SHORT indices.');
}

gl.enable(gl.DEPTH_TEST);

gl.enable(gl.CULL_FACE);
gl.cullFace(gl.BACK);


gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);

var vertexCount = 0;
var indexCount = 0;
var theta = 0;
var vBuffer, cBuffer, nBuffer, iBuffer;
var program;
const obj_file = "monke.obj";

window.onload = async function init() {
    const drawingInfo = await readOBJFile(obj_file, 1.0, false);
    if (!drawingInfo) {
        alert('Failed to load OBJ file.');
        return;
    }

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    vBuffer = gl.createBuffer();
    cBuffer = gl.createBuffer();
    nBuffer = gl.createBuffer();
    iBuffer = gl.createBuffer();

    updateBuffers(drawingInfo);

    vertexCount = drawingInfo.vertices.length / 4;
    indexCount = drawingInfo.indices.length;

    const projectionMatrix = perspective(45, canvas.width / canvas.height, 0.1, 100.0);
    const uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));

    render();
}

function updateBuffers(drawingInfo) {
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);
    const vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.colors, gl.STATIC_DRAW);
    const vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.normals, gl.STATIC_DRAW);
    const vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    theta += 0.5;
    const cameraRadius = 5.0;
    const eye = vec3(cameraRadius * Math.sin(radians(theta)), 0, cameraRadius * Math.cos(radians(theta)));
    const at = vec3(0, 0, 0);
    const up = vec3(0, 1, 0);

    var modelViewMatrix = lookAt(eye, at, up);
    var modelViewMatrixAttrib = gl.getUniformLocation(program, "modelViewMatrix");
    gl.uniformMatrix4fv(modelViewMatrixAttrib, false, flatten(modelViewMatrix));

    var indexType = ext ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    gl.drawElements(gl.TRIANGLES, indexCount, indexType, 0);

    requestAnimationFrame(render);
}
