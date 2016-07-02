;(function(){
	/*
	 * 经纬度转墨卡托
	 * @param {Array} lnglat 经纬度
	 */
	function coorToMerc(lnglat) {
		var merc = []
		merc[0] = lnglat[0] *20037508.34/180
		merc[1] = Math.log(Math.tan((90+lnglat[1])*Math.PI/360))/(Math.PI/180)
		merc[1] = merc[1] *20037508.34/180
		return merc //返回墨卡托坐标
	}
	/*
	 * 经纬度到像素
	 * @param {Array} coor 经纬度
	 * @param {Array} center 地图中心
	 * @param {Number} zoom 缩放
	 * @param {Number} angle 角度
	 */
	function coorToPx(coor,center,zoom,angle){
		var merc = coorToMerc(coor) //经纬度转化得到墨卡托
		var disX = merc[0] - center[0]
		var disY = merc[1] - center[1]
		var Rx = disX * Math.cos(angle*Math.PI/180) + disY * Math.sin(angle*Math.PI/180)
		var Ry = disY * Math.cos(angle*Math.PI/180) - disX * Math.sin(angle*Math.PI/180)
		return [Rx*zoom,-Ry*zoom]
	}
	/*
	 * 获取画布中心点
	 * @param{Object} el 要取得中心点的元素
	 */
	function getCenter(el){  
		return [el.width/2,el.height/2-el.offsetTop]
	}
	/*
	 * 事件兼容性
	 */
	function eventCompat(e){
		var type = e.type
		if (type == 'DOMMouseScroll' || type == 'mousewheel') {
			e.delta = (e.wheelDelta) ? e.wheelDelta / 120 : -(e.detail || 0) / 3
		}
		return e //返回事件对象
	}
	/*
	 * 像素转经纬度
	 * @param{Object} e 事件对象
	 * @param{Array} center 地图中心点
	 * @param{Number} angle 地图角度
	 * @param{Number} zoom 地图缩放等级
	 * @param{Array} canvasCenter 画布中心
	 */
	function pxToCoor(e,center,angle,zoom,canvasCenter){
		var rX = e.clientX - canvasCenter[0]
		var rY = e.clientY - canvasCenter[1]
		
		var x = rX * Math.cos(angle*Math.PI/180) + rY * Math.sin(angle*Math.PI/180)
		var y = rY * Math.cos(angle*Math.PI/180) - rX * Math.sin(angle*Math.PI/180)
				
		var mercatorX = x / zoom + center[0]
		var mercatorY = -y / zoom + center[1]
	
		mercatorX = mercatorX / 20037508.34 * 180
		mercatorY = mercatorY / 20037508.34 * 180
		mercatorY = 180 / Math.PI * (2 * Math.atan(Math.exp(mercatorY * Math.PI / 180)) - Math.PI / 2)
		//console.log([mercatorX,mercatorY])
		return [mercatorX,mercatorY] //返回经纬度
	}
	/*
	 * 兼容鼠标滚动
	 */
	var mouseEvent = (function(undefined){
		var type = document.mozHidden !== undefined ? 'DOMMouseScroll' : 'mousewheel' //判断浏览器
		return function(el,fn,capture){
			el.addEventListener(type,function(e){
				fn.call(this,eventCompat(e))
			},capture || false)
		}
	})()
	function createObject(prototype,construct){
		var F = function(){}
		F.prototype = prototype
		var newPro = new F()
		newPro.construct = construct
		return newPro
	}
	function mix(r, s) {
		for (var p in s) {
			if (s.hasOwnProperty(p)) {
				r[p] = s[p]
			}
		}
		return r
	}
	function extend(r, s, px, sx) {
		if (!s || !r) return r
		
		var sp = s.prototype,
			rp
		rp = createObject(sp, r)
		r.prototype = mix(rp, r.prototype)
		
		r.superclass = createObject(sp, s)
		
		if (px) mix(rp, px)
		if (sx) mix(r, sx)
		
		return r
	}
	var R ={}
	/*
	 * 初始化canvas
	 * @param{String} target
	 */
	R.map = function(target,center,zoom){
		this.zoom = zoom
		this.angle = 290
		this.center = coorToMerc(center)
		this.objList = [] //订阅列表
		var box = document.getElementById(target)
		var canvas = this.canvas = document.createElement('canvas') //创建canvas
		var ctx = canvas.getContext('2d')
		canvas.width = box.offsetWidth
		canvas.height = box.offsetHeight
		this.canvasCenter = getCenter(canvas) //取得canvas中心点
		box.appendChild(canvas)
		this.bind()
		return this
	}
	R.map.prototype = {
		/*
		 * 对canvas绑定事件
		 */
		bind:function(){
			var that = this,
				canvasCenter = that.canvasCenter
			console.log(canvasCenter)
			mouseEvent(this.canvas,function(e){  //鼠标滚动事件
				var delta = e.delta
				if (delta<0 && that.zoom>6) {
					that.zoom -= 4     //改变zoom
				}else if(delta>0 && that.zoom<26){
					that.zoom += 4
				}
				
				that.center = pxToCoor(e,that.center,that.angle,that.zoom,that.canvasCenter)
				that.center = coorToMerc(that.center)
				that.canvasCenter = [e.clientX,e.clientY]
				that.update()
			},false)
			//鼠标拖动事件
			this.canvas.addEventListener('mousedown',function(e){
				that.start = [e.clientX,e.clientY]
				that.drag = true  //是否可拖动
			},false)
			this.canvas.addEventListener('mousemove',function(e){
				if(that.drag){
					var offx = e.clientX-that.start[0]
					var offy = e.clientY-that.start[1]
					that.canvasCenter[0] = that.canvasCenter[0] + offx
					that.canvasCenter[1] = that.canvasCenter[1] + offy  //改变中心点位置
					
					that.update()
					that.start = [e.clientX,e.clientY]
				}
			},false)
			this.canvas.addEventListener('mouseup',function(){
				that.drag = false
			},false)
		},
		/*
		 * 清除画布
		 */
		clearMap:function(){
			var canvas = this.canvas
			var ctx = canvas.getContext('2d')
			ctx.save()
			ctx.clearRect(0,0,canvas.width,canvas.height)   //清除
			ctx.restore()
		},
		setList:function(item){
			if(this.objList.indexOf(item) === -1) this.objList.push(item)
		},
		/*
		 * 刷新地图
		 */
		update:function(){
			this.clearMap()
			this.objList.forEach(function(i){
				i.update()
			})
		},
		getCenter:function(){
			return this.center
		},
		getRotation:function(){
			return this.angle
		},
		getZoom:function(){
			return this.zoom
		},
		setCenter:function(center){
			this.center=coorToMerc(center)
		},
		setRotation:function(angle){
			this.angle=angle
		},
		setZoom:function(zoom){
			this.zoom=zoom
		}
	}
	function Base(){

	}
	Base.prototype.addTo = function(obj){
		this.obj = obj
		obj.setList(this)
		this.update()
	}
	/*
	 * 加载地图
	 * @param{String} url //地图路径
	 */
	R.loadMap = function(url){
		R.loadMap.superclass.construct.call(this)
		this.url = url
	}
	extend(R.loadMap,Base,{
		/*
		 * 加载geojson
		 */
		load:function(){
			var xhr = new XMLHttpRequest(),
				that = this
			xhr.open('GET',this.url,false)
			xhr.onload = function(){
				that.geo = JSON.parse(xhr.responseText)
			}
			xhr.send()
			return this
		},
		/*
		 * 画图
		 */
		update:function(){
			var obj = this.obj  //取得zoom angle center等参数
			var canvas = obj.canvas,
				ctx = canvas.getContext('2d'),
				zoom = obj.zoom,
				angle = obj.angle,
				canvasCenter = obj.canvasCenter,
				center = obj.center
			console.time('R')
			ctx.save()
			ctx.globalCompositeOperation="destination-over"
			ctx.translate(canvasCenter[0],canvasCenter[1])//重置画布中心点
			//遍历geojson
			for(var i in this.geo.features){
				var coor = this.geo.features[i].geometry.coordinates
				ctx.beginPath()
				for(var j in coor){
					var px = coorToPx(coor[j],center,zoom,angle)
					ctx.lineTo(px[0],px[1])
				}
				ctx.fillStyle=this.geo.features[i].properties.fillcolor
				//ctx.stroke()
				ctx.fill()
				ctx.closePath()
			}
			ctx.restore()
			console.timeEnd('R')
			//根据zoom改变字体大小
			var font = '16px Arial'
			var features = this.geo.features,
				icon = this.icon = []
			if(zoom<=3){
				font = 0 + 'px' + ' ' + 'Arial'
			}else if(zoom>3 && zoom <16){
				font = zoom + 'px' + ' ' + 'Arial'
			}else{
				font = '16px Arial'
			}
			
			ctx.save()
			ctx.translate(canvasCenter[0],canvasCenter[1])
			ctx.beginPath()
			ctx.textAlign="center"
			ctx.font=font
			for(var i in features){
				var textPos = features[i].geometry.coordinates
				var px = coorToPx(textPos,center,zoom,angle)
				if(features[i].geometry.type === 'Point'){
					var textCon = features[i].properties.name
					ctx.fillText(textCon,px[0],px[1])
				}
			}
			ctx.closePath()
			ctx.restore()
		}
	})
	/*
	 * 
	 */
	R.Marker = function(){
		R.Marker.superclass.construct.call(this)
	}
	extend(R.Marker,Base,{
		/*
		 * 设置图标路径
		 * @param{String} src
		 */
		setIcon:function(src){
			this.src = src
			return this
		},
		/*
		 * 图标位置
		 * @param{Array} coor
		 */
		setCoordinates:function(coor){
			this.coor = coor
		},
		/*
		 * 画图标
		 */
		update:function(){
			var obj = this.obj
			var canvas = obj.canvas,
				ctx = canvas.getContext('2d'),
				zoom = obj.zoom,
				angle = obj.angle,
				canvasCenter = obj.canvasCenter,
				center = obj.center,
				points = this.coor
			var img = new Image()
			img.src = this.src
			img.onload = function () {
				ctx.save()
				ctx.translate(canvasCenter[0],canvasCenter[1])
				points.forEach(function(i){
					var px = coorToPx(i,center,zoom,angle)
					ctx.drawImage(img,px[0]-12,px[1]-40)
				})
				ctx.restore()
			}
		}
	})

	/*
	 * 热力图
	 */
	R.heatmap=function(r){
		R.heatmap.superclass.construct.call(this)
		this.defaultRadius= r === undefined ? 52 : r //热力点大小
	}
	extend(R.heatmap,Base,{
		/*
		 * 默认参数
		 */
		defaultGradient:{
			0.2: 'blue',
			0.4: 'cyan',
			0.6: 'lime',
			0.8: 'yellow',
			1.0: 'red'
		},
		setCoordinates:function(coor){
			this.coor = coor	
		},
		/*
		 * 创建热力图用到的点
		 */
		radius:function(r, blur){
			blur = blur === undefined ? 26 : blur
			var circle = this.circle = document.createElement('canvas'),
    			ctx = circle.getContext('2d'),
    			r2 = this.r = r + blur

			circle.width = circle.height = r2 * 2

			ctx.shadowOffsetX = ctx.shadowOffsetY = r2 * 2
			ctx.shadowBlur = blur
			ctx.shadowColor = 'black'

			ctx.beginPath()
			ctx.arc(-r2, -r2, r, 0, Math.PI * 2, true)
			ctx.closePath()
			ctx.fill()

			return this
		},
		/*
		 * 创建热力图画板
		 */
		gradient:function(grad){
			var canvas = document.createElement('canvas'),
				ctx = canvas.getContext('2d'),
				gradient = ctx.createLinearGradient(0, 0, 0, 256)
	
			canvas.width = 1
			canvas.height = 256

			for (var i in grad){
				gradient.addColorStop(i, grad[i])
			}

			ctx.fillStyle = gradient
			ctx.fillRect(0, 0, 1, 256)

			this.grad = ctx.getImageData(0, 0, 1, 256).data
			
			return this
		},
		/*
		 * 变成热力图的样子
		 */
		colorize:function(pixels, gradient){
			for (var i = 0, len = pixels.length, j; i < len; i += 4) {
				j = pixels[i + 3] * 4

				if (j) {//改变每个像素
    				pixels[i] = gradient[j]
    				pixels[i + 1] = gradient[j + 1]
    				pixels[i + 2] = gradient[j + 2]
				}
				//pixels[i+3] = 0
			}
		},
		/*
		 * 画热力图
		 * @param{Number} minOpacity 透明度
		 */
		update:function(minOpacity){
			var obj = this.obj
			var canvas = obj.canvas,
				ctx = canvas.getContext('2d'),
				zoom = obj.zoom,
				angle = obj.angle,
				canvasCenter = obj.canvasCenter,
				center = obj.center,
				points = this.coor
			var hcanvas = document.createElement('canvas'),
				hctx = hcanvas.getContext('2d')
			hcanvas.width = canvas.width
			hcanvas.height = canvas.height
			if (!this._circle) this.radius(this.defaultRadius)
			if (!this._grad) this.gradient(this.defaultGradient)
			//ctx.clearRect(0, 0, canvas.width, canvas.height)
			hctx.save()
			hctx.globalCompositeOperation="destination-over"
			hctx.translate(canvasCenter[0],canvasCenter[1])
			for (var i = 0, len = points.length, p; i < len; i++) {
				p = coorToPx(points[i],center,zoom,angle)
				
				hctx.globalAlpha = 0.426
				hctx.drawImage(this.circle,p[0] - this.r,p[1] - this.r)
			}
			hctx.restore()

			var colored = hctx.getImageData(0, 0, canvas.width, canvas.height)//取得每个像素
			this.colorize(colored.data,this.grad)
			
			hctx.putImageData(colored, 0, 0)
			var dataURL = hcanvas.toDataURL()
			var img = new Image()
			img.src = dataURL
			
			ctx.drawImage(img,0,0)
			delete window[hcanvas]
			return this
		}
	})

	window.R = R
})()