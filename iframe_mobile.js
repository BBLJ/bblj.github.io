/// <reference path="./procustomizer.js"/>

const viewModel = {
    /** @type {HTMLCanvasElement} */
    canvas : null,
    /** @type {CanvasRenderingContext2D} */
    ctx : null,
    canvasSize : {w: 512, h:512},
    /** @type {Image} */
    uvLayout: null,
    backgroundColor : "rgb(255, 255, 255)",
    /** @type {[function]} */
    steps : [],
    /** @type {[function]} */
    redoSteps : [],
    /** @type {[Stamp]} */
    toDrawlayers : [],    
    /** @type {[Stamp]} */
    layers : [],
    /** @type {Stamp} */
    currentLayer: null,
    isMovingCurrentLayer: false,
    isRoscaling: false,
    beginTouch: {x0:0, y0:0, x1:0, y1:0},

    isExportToDataUrl : false,
    /** @type {Promise<ArrayBuffer>} */
    //taskPreviewArrayBuffer : null,
    mtlName : "Surface1",
    /** @type {Promise<ArrayBuffer>} */
    taskProductArrayBuffer : new Promise((done, failed) => {
        done(_ProCustomizerConstants.assets.cube);
    }),

    /** @type {Product3DPreviewer} */
    previewer: null,
    frameDrawed: 0,


    isMouseOnCanvas : false,
    /** @type {Stamp} */
    currentStamp : null,
    currentBrush: new StampBrush(),
    /** @type {StampImage} */
    currentImage: null,
    currentFont : new StampFont(),
};
const editor = {
    /** @type {string} */
    uuid: "",
    /** @param {number} canvasW  @param {number} canvasH */
    initCanvas: function(canvasW, canvasH){
        viewModel.canvas = document.getElementById("materialPainter");
        if(canvasW && canvasH){
            viewModel.canvasSize = {w:canvasW, h:canvasH};
        }
        editor.resizeCanvas();
        viewModel.ctx = viewModel.canvas.getContext("2d");
        window.addEventListener("resize", function(){
            editor.resizeCanvas();
        });
        viewModel.canvas.addEventListener("mouseenter", function(){
            viewModel.isMouseOnCanvas = true;
        });
        viewModel.canvas.addEventListener("mousedown", function(ev){
            if(viewModel.currentLayer){
                let canvasX = ev.offsetX * (viewModel.canvas.width / viewModel.canvas.clientWidth);
                let canvasY = ev.offsetY * (viewModel.canvas.height / viewModel.canvas.clientHeight);
                if(viewModel.currentLayer.isContainsPoint(viewModel.currentLayer, {x:canvasX,y:canvasY})){
                    viewModel.isMovingCurrentLayer = true;
                    viewModel.beginTouch.x0 = canvasX;
                    viewModel.beginTouch.y0 = canvasY;
                }
            }
        });
        viewModel.canvas.addEventListener("mousemove", function (ev) {
            if(viewModel.currentLayer){
                if(viewModel.isMovingCurrentLayer){
                    let canvasX = ev.offsetX * (viewModel.canvas.width / viewModel.canvas.clientWidth);
                    let canvasY = ev.offsetY * (viewModel.canvas.height / viewModel.canvas.clientHeight);
                    let vec = {
                        x: canvasX - viewModel.beginTouch.x0,
                        y: canvasY - viewModel.beginTouch.y0,
                    };
                    viewModel.currentLayer.position.x += vec.x;
                    viewModel.currentLayer.position.y += vec.y;
                    viewModel.beginTouch.x0 = canvasX;
                    viewModel.beginTouch.y0 = canvasY;
                }
            } else {
                viewModel.isMovingCurrentLayer = false;
                viewModel.beginTouch.x0 = 0;
                viewModel.beginTouch.y0 = 0;
            }
        });
        window.addEventListener("mouseup", function(ev){
            viewModel.isMovingCurrentLayer = false;
            viewModel.beginTouch.x0 = 0;
            viewModel.beginTouch.y0 = 0;
        });
        viewModel.canvas.addEventListener("click", function (ev) {
            editor.select(null);
            let canvasX = ev.offsetX * (viewModel.canvas.width / viewModel.canvas.clientWidth);
            let canvasY = ev.offsetY * (viewModel.canvas.height / viewModel.canvas.clientHeight);
            for(let i = 0; i < viewModel.layers.length; i++){
                let layer = viewModel.layers[viewModel.layers.length - i - 1];
                if(!layer.isDeleted && layer.stampType == StampType.Image){
                    /** @type {ImageStamp} */
                    let imgStamp = layer;
                    if(imgStamp.isContainsPoint(imgStamp, {x:canvasX,y:canvasY})){
                        editor.select(layer);
                        break;
                    }
                }
            }
        });
        viewModel.canvas.addEventListener("touchstart", function(ev){
            if(viewModel.currentLayer){
                if(ev.touches.length == 1){
                    viewModel.isMovingCurrentLayer = true;
                    viewModel.beginTouch.x0 = ev.touches[0].clientX;
                    viewModel.beginTouch.y0 = ev.touches[0].clientY;
                }
                if(ev.touches.length == 2){
                    viewModel.isRoscaling = true;
                    viewModel.isMovingCurrentLayer = false;
                    viewModel.beginTouch.x0 = ev.touches[0].clientX;
                    viewModel.beginTouch.y0 = ev.touches[0].clientY;
                    viewModel.beginTouch.x1 = ev.touches[1].clientX;
                    viewModel.beginTouch.y1 = ev.touches[1].clientY;
                }
            }
        });
        window.addEventListener("touchmove", function(ev){
            if(viewModel.isMovingCurrentLayer){
                let vec = {
                    x: ev.touches[0].clientX - viewModel.beginTouch.x0,
                    y: ev.touches[0].clientY - viewModel.beginTouch.y0,
                };
                viewModel.currentLayer.position.x += vec.x;
                viewModel.currentLayer.position.y += vec.y;
                viewModel.beginTouch.x0 = ev.touches[0].clientX;
                viewModel.beginTouch.y0 = ev.touches[0].clientY;
            } else if(viewModel.isRoscaling){
                let distance = distanceBetweenTwoPoints(viewModel.beginTouch.x0, viewModel.beginTouch.y0, viewModel.beginTouch.x1, viewModel.beginTouch.y1);
                let distance2 = distanceBetweenTwoPoints(ev.touches[0].clientX, ev.touches[0].clientY, ev.touches[1].clientX, ev.touches[1].clientY);
                let scaleRatio = distance2 / distance;
                let theta0 = degreeFromCoordinate(viewModel.beginTouch.x0, viewModel.beginTouch.y0, viewModel.beginTouch.x1, viewModel.beginTouch.y1);
                let theta1 = degreeFromCoordinate(ev.touches[0].clientX, ev.touches[0].clientY, ev.touches[1].clientX, ev.touches[1].clientY);               
                if(viewModel.currentLayer){
                    if(viewModel.currentLayer.stampType == StampType.Image){
                        /** @type {ImageStamp} */
                        let imgStamp = viewModel.currentLayer;
                        imgStamp.stampBody.width = imgStamp.stampBody.width*scaleRatio;
                        imgStamp.stampBody.height = imgStamp.stampBody.height*scaleRatio;
                        let rot = (theta0 - theta1);
                        if(Math.abs(rot) <= 30){
                            imgStamp.stampBody.rotation += rot;
                            imgStamp.stampBody.rotation = imgStamp.stampBody.rotation % 360;    
                        }
                    }
                }
                viewModel.beginTouch.x0 = ev.touches[0].clientX;
                viewModel.beginTouch.y0 = ev.touches[0].clientY;
                viewModel.beginTouch.x1 = ev.touches[1].clientX;
                viewModel.beginTouch.y1 = ev.touches[1].clientY;
            }
        });
        window.addEventListener("touchend", function(ev){
            viewModel.isMovingCurrentLayer = false;
            viewModel.isTouching = false;
            viewModel.beginTouch.x0 = 0;
            viewModel.beginTouch.y0 = 0;
            viewModel.beginTouch.x1 = 0;
            viewModel.beginTouch.y1 = 0;
        });
        viewModel.canvas.addEventListener("mouseleave", function(){
            viewModel.isMouseOnCanvas = false;
        });
        window.setInterval(function(){
            //console.log(viewModel.frameDrawed/2);
            viewModel.frameDrawed = 0;
        }, 2000);
    },
    resizeCanvas: function(){
        viewModel.canvas.width = viewModel.canvasSize.w;
        viewModel.canvas.height = viewModel.canvasSize.h;
        let parentRect = viewModel.canvas.parentElement.getBoundingClientRect();
        if(viewModel.canvas.width / viewModel.canvas.height > parentRect.width / parentRect.height){
            viewModel.canvas.style.width = "100%";
            viewModel.canvas.style.height = "unset";
        } else {
            viewModel.canvas.style.width = "unset";
            viewModel.canvas.style.height = "100%";
        }
        // w0/h0 < w1/h1 -> h 100%
        //
    },
    /** @param step {Function} */
    addStep: function(step){
        viewModel.steps.push(step);
        viewModel.redoSteps.length = 0;
        //window.top.console.log(viewModel.steps);
    },
    /** @param {MouseEvent} ev @param {HTMLDivElement} canvasWrapper */
    onCanvasWrapperClicked: function(ev, canvasWrapper){
        if(ev.target == canvasWrapper){
            editor.select(null);
        }
    },
    /** @param {Stamp} layer */
    select: function(layer){
        if(layer){
            viewModel.currentLayer = layer;
            if(layer.stampType == StampType.Image){
                editor.showStickerOverlayControls();
            }
            let zIndex = 0;
            viewModel.layers.forEach(function(layer){
                if(layer.zIndex > zIndex){
                    zIndex = layer.zIndex;
                }
            });
            layer.zIndex = zIndex + 1;
        } else {
            viewModel.currentLayer = null;
            editor.hideAllOverlayControls();
        }
    },
    showStickerOverlayControls: function(){
        document.getElementById("btnDeleteImageWrapper").style.display = "block";
        document.getElementById("scalerWrapper").style.display = "block";
        document.getElementById("rotaterWrapper").style.display = "block";
    },
    hideAllOverlayControls: function(){
        document.getElementById("btnDeleteImageWrapper").style.display = "none";
        document.getElementById("scalerWrapper").style.display = "none";
        document.getElementById("rotaterWrapper").style.display = "none";
    },
    sticker: function(){
        let btnChangeSticker = document.getElementById("btnChangeSticker");
        btnChangeSticker.click();
    },
    /** @param {HTMLInputElement} btnChangeSticker */
    onStickerChangedAsync: function(btnChangeSticker){
        let task = async function(onDone){
            let [f] = btnChangeSticker.files;
            if(f){
                let img = new Image();
                img.src = URL.createObjectURL(f);
                let t = new Promise(function(onDone){
                    img.onload = onDone;
                });
                await t;
                let stickerImg = new StampImage();
                stickerImg.dataUrl = img.src;
                stickerImg.naturalWidth = img.naturalWidth;
                stickerImg.naturalHeight = img.naturalHeight;
                let ratio = 1;
                if(stickerImg.naturalWidth > viewModel.canvasSize.w*0.9 || stickerImg.naturalHeight > viewModel.canvasSize.h*0.9){
                    let rw = stickerImg.naturalWidth / (viewModel.canvasSize.w*0.9);
                    let rh = stickerImg.naturalHeight / (viewModel.canvasSize.h*0.9);
                    ratio = 1/Math.max(rw, rh);
                }
                stickerImg.defaultWidth = stickerImg.naturalWidth * ratio;
                stickerImg.defaultHeight = stickerImg.naturalHeight * ratio;
                stickerImg.width = stickerImg.defaultWidth;
                stickerImg.height = stickerImg.defaultHeight;
                stickerImg.rotation = 0;
                let imgStamp = new ImageStamp(stickerImg);
                imgStamp.position = new Vector2D(viewModel.canvasSize.w/2, viewModel.canvasSize.h/2);
                viewModel.layers.push(imgStamp);
                editor.select(imgStamp);
                editor.addStep(function(){
                    viewModel.toDrawlayers.push(imgStamp);
                });
            }
            onDone();
        };
        return new Promise(task);
    },
    /** @param {HTMLInputElement} scaler */
    onScalerChanged: function(scaler){
        if(viewModel.currentLayer){
            if(viewModel.currentLayer.stampType == StampType.Image){
                /** @type {ImageStamp} */
                let imgStamp = viewModel.currentLayer;
                imgStamp.stampBody.width = imgStamp.stampBody.defaultWidth * (scaler.value/100);
                imgStamp.stampBody.height = imgStamp.stampBody.defaultHeight * (scaler.value/100);
            }
        }
    },
    /** @param {HTMLInputElement} rotater */
    onRotaterChanged: function(rotater){
        if(viewModel.currentLayer){
            if(viewModel.currentLayer.stampType == StampType.Image){
                /** @type {ImageStamp} */
                let imgStamp = viewModel.currentLayer;
                imgStamp.stampBody.rotation = parseFloat(rotater.value);
            }
        }
    },
    onBtnDeleteImageClicked: function(){
        let cy = viewModel.currentLayer;
        editor.select(null);
        editor.addStep(function(){
            cy.isDeleted = true;    
        });
    },
    previewResultAsync: function(){
        document.getElementById("previewResult").style.display = "block";
        viewModel.previewer = new Product3DPreviewer();
        let task = async function(onDone){
            let buf = await viewModel.taskProductArrayBuffer;
            await viewModel.previewer.setPreviewProduct3DAsync(buf);
            viewModel.isExportToDataUrl = true;
            editor.drawCanvas();
            viewModel.isExportToDataUrl = false;
            let texture = viewModel.canvas.toDataURL();
            texture = await editor.adjustTextureAsync(texture);
            await viewModel.previewer.useTextureAsync(viewModel.mtlName, texture);
            viewModel.previewer.mount(document.getElementById("canvPreview"));
            onDone();
        };
        return new Promise(task);
    },
    /** @param {MouseEvent} ev @param {HTMLDivElement} previewResult */
    closePreviewResult: function(ev, previewResult){
        if(ev.target == previewResult){
            if(viewModel.previewer){
                viewModel.previewer.unmount();
                viewModel.previewer = null;
            }
            previewResult = document.querySelector("#previewResult");
            previewResult.style.display = "none";
        }
    },
    drawCanvas: function(){
        viewModel.backgroundColor = "rgb(255, 255, 255)";
        viewModel.toDrawlayers.length = 0;
        viewModel.steps.forEach(function(step){
            step();
        });
        viewModel.ctx.fillStyle = viewModel.backgroundColor;
        viewModel.ctx.clearRect(0, 0, viewModel.ctx.canvas.width, viewModel.ctx.canvas.height);
        viewModel.ctx.beginPath();
        viewModel.ctx.rect(0, 0, viewModel.ctx.canvas.width, viewModel.ctx.canvas.height);
        viewModel.ctx.fill();
        //draw layers
        let sortedByZIndex = viewModel.toDrawlayers.sort((layer1, layer2) => layer1.zIndex - layer2.zIndex);
        sortedByZIndex.forEach(function(stamp){
            if(!stamp.isDeleted){
                stamp.onDraw(stamp, viewModel.ctx);
            }
        });
        //draw uvLayout
        if(!viewModel.isExportToDataUrl){
            if(viewModel.uvLayout){
                viewModel.ctx.drawImage(viewModel.uvLayout, 0,0, viewModel.ctx.canvas.width, viewModel.ctx.canvas.height);
            }
        }
        //draw current layer bound
        if(!viewModel.isExportToDataUrl && viewModel.currentLayer){
            if(viewModel.currentLayer.stampType == StampType.Image){
                viewModel.ctx.save();
                /** @type {ImageStamp} */
                let imgStamp = viewModel.currentLayer;
                viewModel.ctx.translate(imgStamp.position.x,imgStamp.position.y);
                viewModel.ctx.rotate(degreeToRadian(imgStamp.stampBody.rotation));
                viewModel.ctx.strokeStyle = "black";
                viewModel.ctx.strokeRect(-imgStamp.stampBody.width/2,-imgStamp.stampBody.height/2,imgStamp.stampBody.width,imgStamp.stampBody.height);
                viewModel.ctx.rotate(-degreeToRadian(imgStamp.stampBody.rotation));
                viewModel.ctx.restore();
            }
        }
    },
    mainLoop: function(){
        editor.drawCanvas();
        viewModel.frameDrawed++;
        requestAnimationFrame(editor.mainLoop);
    },
    /** @param {string} texture*/
    adjustTextureAsync: async function(texture){
        let img = new Image();
        let taskLoadImage = new Promise(function(onDone){
            img.src = texture;
            img.onload = onDone;
        });
        await taskLoadImage;
        /** @type {HTMLCanvasElement} */
        let canvas = document.createElement("canvas");        
        let ctx = canvas.getContext("2d");
        canvas.width = Math.max(img.naturalWidth, img.naturalHeight);
        canvas.height = Math.max(img.naturalWidth, img.naturalHeight);
        let y = (canvas.height - img.naturalHeight)/2;
        ctx.drawImage(img, 0,0,img.naturalWidth,img.naturalHeight,0,y,img.naturalWidth,img.naturalHeight);
        texture = canvas.toDataURL();
        return texture;
    },
    /** @type {BroadcastChannel} */
    bcLoadProduct: null,
    /** @param {MessageEvent} ev */
    loadProductAsync: function(ev){
        if(ev.data.arrayBuffer3d){
            viewModel.taskProductArrayBuffer = new Promise((done)=>{done(ev.data.arrayBuffer3d);});
        }
        if(ev.data.mtlName){
            viewModel.mtlName = ev.data.mtlName;
        }
        if(ev.data.uvLayoutUrl){
            viewModel.uvLayout = new Image();
            viewModel.uvLayout.src = ev.data.uvLayoutUrl;
        }
    },
    /** @type {BroadcastChannel} */
    bcGetCanvasPicture: null,
    /** @param {MessageEvent} ev */
    getCanvasPicture: function(ev){
        viewModel.isExportToDataUrl = true;
        editor.drawCanvas();
        viewModel.isExportToDataUrl = false;
        let pic = viewModel.canvas.toDataURL();
        editor.bcGetCanvasPicture.postMessage(pic);
    },
    /** @type {BroadcastChannel} */
    bcPlaceOrder: null,
    placeOrderAsync: async function(){
        //{productArrayBuffer: ArrayBuffer, mtlName: string, textureImg:string}
        let buf = await viewModel.taskProductArrayBuffer;
        viewModel.isExportToDataUrl = true;
        editor.drawCanvas();
        viewModel.isExportToDataUrl = false;
        let texture = viewModel.canvas.toDataURL();
        texture = await editor.adjustTextureAsync(texture);
        editor.bcPlaceOrder.postMessage({productArrayBuffer: buf, mtlName: viewModel.mtlName, textureImg:texture});
    },
};


window.editor = editor;
window.initWithUuid_Size = function(uuid, canvasW, canvasH){
    editor.uuid = uuid;
    editor.initCanvas(canvasW, canvasH);
    editor.bcLoadProduct = new BroadcastChannel(_ProCustomizerConstants.bcLoadProduct + "_" + editor.uuid);
    editor.bcLoadProduct.addEventListener("message", editor.loadProductAsync);
    editor.bcGetCanvasPicture = new BroadcastChannel(_ProCustomizerConstants.bcGetCanvasPicture + "_" + editor.uuid);
    editor.bcGetCanvasPicture.addEventListener("message", editor.getCanvasPicture);
    editor.bcPlaceOrder = new BroadcastChannel(_ProCustomizerConstants.bcPlaceOrder + "_" + editor.uuid);
    editor.bcPlaceOrder.addEventListener("message", editor.placeOrderAsync);
    editor.mainLoop();
};

