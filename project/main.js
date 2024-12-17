/**
 * Integrating the trackball-like controls from your snippet with the teapot OBJ,
 * matcap shading, and appropriate scene setup.
 */

var canvas = document.getElementById("gl-canvas");
canvas.width = 800;
canvas.height = 800;


var gl = WebGLUtils.setupWebGL(canvas);
if(!gl) { alert("WebGL not available"); }

var ext = gl.getExtension('OES_element_index_uint');
if(!ext) { alert("WebGL not available"); }
var indexType = ext ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;

gl.enable(gl.DEPTH_TEST);
/* Commented out for now. Culling made the objects see through.
gl.enable(gl.CULL_FACE);
gl.cullFace(gl.BACK);
 */
gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);

//Primary variables
var program;
var vBuffer, nBuffer, iBuffer;
var indicesCount = 0;

//UI Variables
let mode = 'orbit'; // 'orbit', 'dolly', 'pan'
//Orbit
let isDragging = false;
let lastPos = null;
let lastSpherePos = null;
let rotationQuat = new Quaternion();
rotationQuat.setIdentity();
let dampingFactor = 0.9;
let angularVelocityAxis = [0,0,0];
let angularVelocitySpeed = 0;
//pan
let panX = 0;
let panY = 0;
//dolly / zoom
let distance = 5; // distance to look-at point
let lastTime = Date.now();

// For matcap
var matcapTexture, matcapLoc;

// For Wireframe
let wireframeOn = false;
let iWireframeBuffer;
let wireframeCount;

// Uniform locations
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc, uvDisplayLoc, uvInvertedLoc;

//Camera Pos
var eye = vec3(0, 0, distance);
var at = vec3(0,0,0);
var up = vec3(0,1,0);

window.onload = async function() {
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");
    matcapLoc = gl.getUniformLocation(program, "matcapTexture");
    uvDisplayLoc = gl.getUniformLocation(program, "uvDisplay");
    uvInvertedLoc = gl.getUniformLocation(program, "uvInverted");

    let drawingInfo = await readOBJFile("models/sphere.obj", 1.0, false);
    if(!drawingInfo) { console.error("Failed to load OBJ"); return; }

    setupBuffers(drawingInfo);

    var projectionMatrix = perspective(45, 1, 0.1, 100);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    // Default matcap set to the first one
    setupMatcapTexture("matcaps/mat1.png");

    // A lot of mouse handlers for the interactivity
    canvas.onmousedown = function(event) {
        switch(event.button){
            case 0:
                mode = 'orbit';
                break;
            case 1:
                mode = 'dolly';
                break;
            case 2:
                mode = 'pan';
                break;
                default:
                    break;
        }

        isDragging = true;
        lastPos = getMousePosition(event);
        lastTime = Date.now();
        if(mode==='orbit'){
            lastSpherePos = getSpherePoint(lastPos.x, lastPos.y, canvas.width, canvas.height);
            angularVelocityAxis = [0,0,0];
            angularVelocitySpeed = 0;
        }
    };
    canvas.onwheel = function(event) {
        distance += event.deltaY * 0.005;
        distance = Math.max(1.0, Math.min(100.0, distance));
        updateViewMatrix();
    }

    canvas.onmouseup = function(event) {
        isDragging = false;
        lastPos = null;
        lastSpherePos = null;
    };

    canvas.onmousemove = function(event) {
        if(!isDragging) return;

        const currentPos = getMousePosition(event);
        const currentTime = Date.now();
        const deltaTime = (currentTime - lastTime)/1000;

        if(mode==='orbit') {
            const currentSpherePos = getSpherePoint(currentPos.x, currentPos.y, canvas.width, canvas.height);

            const axis = cross(lastSpherePos, currentSpherePos);
            const angle = Math.acos(Math.min(1.0, Math.max(-1.0, dot(normalize(lastSpherePos), normalize(currentSpherePos)))));

            if(!isNaN(angle) && angle!==0) {
                const rotQuat = new Quaternion();
                rotQuat.make_rot_angle_axis(angle, axis);
                rotationQuat = rotQuat.multiply(rotationQuat);

                if(deltaTime>0){
                    angularVelocityAxis = normalize(axis);
                    angularVelocitySpeed = angle/deltaTime;
                }
            }

            lastSpherePos = currentSpherePos;
        } else if(mode==='dolly') {
            const deltaY = currentPos.y - lastPos.y;
            const dollyScale = 0.05;
            distance += deltaY*dollyScale;
            distance = Math.max(1.0, Math.min(100.0, distance));
        } else if(mode==='pan') {
            const deltaX = currentPos.x - lastPos.x;
            const deltaY = currentPos.y - lastPos.y;
            const panScale = 0.005;
            panX += -deltaX * panScale;
            panY += deltaY * panScale;
        }

        lastPos = currentPos;
        lastTime = currentTime;
        updateViewMatrix();
    };

    updateViewMatrix();
    render();
};



function setupBuffers(drawingInfo) {
    function generateWireframeIndices(indices) {
        const edges = new Set();
        const wireframeIndices = [];

        for (let i = 0; i < indices.length; i += 3) {
            const a = indices[i];
            const b = indices[i + 1];
            const c = indices[i + 2];

            [[a, b], [b, c], [c, a]].forEach(edge => {
                const key = edge[0] < edge[1] ? `${edge[0]}_${edge[1]}` : `${edge[1]}_${edge[0]}`;
                if (!edges.has(key)) {
                    edges.add(key);
                    wireframeIndices.push(edge[0], edge[1]);
                }
            });
        }

        return new Uint32Array(wireframeIndices);
    }
    const wireframeIndices = generateWireframeIndices(drawingInfo.indices);

    // Pos buffer
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);
    var vPosition = gl.getAttribLocation(program,"vPosition");
    gl.vertexAttribPointer(vPosition,4,gl.FLOAT,false,0,0);
    gl.enableVertexAttribArray(vPosition);

    var numVertices = drawingInfo.vertices.length/4;
    var normals3 = new Float32Array(numVertices*3);
    for(var i=0; i<numVertices; i++){
        normals3[i * 3] = drawingInfo.normals[i * 4];
        normals3[i*3+1] = drawingInfo.normals[i*4+1];
        normals3[i*3+2] = drawingInfo.normals[i*4+2];
    }

    // Normal buffer
    nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals3, gl.STATIC_DRAW);
    var vNormal = gl.getAttribLocation(program,"vNormal");
    gl.vertexAttribPointer(vNormal,3,gl.FLOAT,false,0,0);
    gl.enableVertexAttribArray(vNormal);

    // Index buffer
    iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(drawingInfo.indices), gl.STATIC_DRAW);

    //wireframe index buffer
    iWireframeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iWireframeBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, wireframeIndices, gl.STATIC_DRAW);

    //setting the indices
    indicesCount = drawingInfo.indices.length;
    wireframeCount = wireframeIndices.length;
}

async function changeModel(path) {
    let drawingInfo = await readOBJFile("models/" + path + ".obj", 1.0, false);
    if(!drawingInfo) { console.error("Failed to load OBJ"); return; }

    setupBuffers(drawingInfo);
}

function setupMatcapTexture(url) {
    var image = new Image();
    image.onload = function(){
        matcapTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, matcapTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        // Tried different post-processing methods, didn't work but should still be there (apparently)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.generateMipmap(gl.TEXTURE_2D);

        // Binds the texture to the shader (matcapTexture in fragment shader)
        gl.uniform1i(matcapLoc, 0);
    };
    image.src = url;
}

function getMousePosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function getSpherePoint(x,y,width,height) {
    let nx = (2*x - width)/width;
    let ny = (height-2*y)/height;
    const length = nx*nx + ny*ny;
    let nz;
    if(length<=1) {
        nz = Math.sqrt(1-length);
    } else {
        const norm = Math.sqrt(length);
        nx /= norm;
        ny /= norm;
        nz = 0;
    }
    return vec3(nx, ny, nz);
}

function updateViewMatrix() {
    const at = vec3(panX, panY, 0);
    const eye = vec3(panX, panY, distance);
    const up = vec3(0,1,0);

    var viewMatrix = lookAt(eye,at,up);

    let rotationMatrix = rotationQuat.get_mat4();

    let modelViewMatrix = mult(viewMatrix, scalem(0.5,0.5,0.5));
    modelViewMatrix = mult(modelViewMatrix, rotationMatrix);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    let nMat = normalMatrix(modelViewMatrix,true);
    gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(nMat));
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastTime)/1000;
    lastTime = currentTime;

    //apply spinning if orbit mode and not dragging
    if(mode==='orbit' && !isDragging && angularVelocitySpeed!==0){
        const angle = angularVelocitySpeed*deltaTime;
        if(angle!==0) {
            const rotQuat = new Quaternion();
            rotQuat.make_rot_angle_axis(angle, angularVelocityAxis);
            rotationQuat = rotQuat.multiply(rotationQuat);

            // Damping
            angularVelocitySpeed *= dampingFactor;

            const threshold=0.1;
            if(Math.abs(angularVelocitySpeed)<threshold){
                angularVelocitySpeed=0;
            }

            updateViewMatrix();
        }
    }

    if (wireframeOn) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iWireframeBuffer);
        gl.drawElements(gl.LINES, wireframeCount, indexType, 0);
    } else {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
        gl.drawElements(gl.TRIANGLES, indicesCount, indexType, 0);
    }

    requestAnimationFrame(render);
}
