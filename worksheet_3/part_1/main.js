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
gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

var vertices

window.onload = function init() {
    // Define the vertices for the cube
    vertices = [
        vec3(0, 0, 0),
        vec3(1, 0, 0),
        vec3(1, 0, 0),
        vec3(1, 1, 0),
        vec3(1, 1, 0),
        vec3(0, 1, 0),
        vec3(0, 1, 0),
        vec3(0, 0, 0),

        vec3(0, 0, 0),
        vec3(0, 0, 1),
        vec3(1, 0, 0),
        vec3(1, 0, 1),
        vec3(1, 1, 0),
        vec3(1, 1, 1),
        vec3(0, 1, 0),
        vec3(0, 1, 1),

        vec3(0, 0, 1),
        vec3(1, 0, 1),
        vec3(1, 0, 1),
        vec3(1, 1, 1),
        vec3(1, 1, 1),
        vec3(0, 1, 1),
        vec3(0, 1, 1),
        vec3(0, 0, 1),
    ];

    // Load shaders and initialize attribute buffers
    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Vertex buffer
    const vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    const vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var modelViewMatrix = lookAt(vec3(1,1,1), vec3(0,0,0), vec3(0,1,0))
    modelViewMatrix = mult(modelViewMatrix, translate(0.5, 0.5, 0.5));

    const modelViewMatrixAttrib = gl.getUniformLocation(program, "modelViewMatrix");
    gl.uniformMatrix4fv(modelViewMatrixAttrib, false, flatten(modelViewMatrix));


    render();
};

function render() {

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.LINES, 0, vertices.length);
}