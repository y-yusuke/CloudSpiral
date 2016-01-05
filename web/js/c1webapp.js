var endpoint = '../api';

var mapCanvas;
var directionDisplay;
var directionsService;
var stepDisplay;
var pointObjArray = [];
var markerArray = [];
var svpObjArray = [];
var latlng;
var from, to;
var destRoute;

var viewWidth, viewHeight;

$('#transport').click(function() {
	if (isDriveMode()) {
		$('#walk').click();
	} else {
		$('#drive').click();
	}
});

$('#move').click(function() {
	if (isMoveStreetViewMode()) {
		$('#move_off').click();
	} else {
		$('#move_on').click();
	}
});

$('#route_post').click(function() {
	if (navigator.geolocation) {
		// 画面を初期位置へ  スマホ用のようなもの
		window.scrollTo(0, 0);

		// 出発地
		var fromLatlng = function() {
			var dfd = $.Deferred();
			getLatLng(document.getElementById('address_from').value, function() {
				from = latlng;
				dfd.resolve();
			});
			return dfd.promise();
		};

		//目的地
		var toLatlng = function() {
			var dfd2 = $.Deferred();
			getLatLng(document.getElementById('address_to').value, function() {
				to = latlng;
				dfd2.resolve();
			});
			return dfd2.promise();
		};

		//現在地と目的地の緯度経度を算出した後，ルート表示
		$.when(fromLatlng(), toLatlng()).done(function() {
			initialize();
		});
	} else {
		// グーグルマップが使用できないブラウザうんぬん
		alert('not supported');
	};
});

function convertLatLng(pos) {
	// 2つの座標をmapで扱えるように
	return new google.maps.LatLng(pos[0], pos[1]);
}

function getLatLng(place, func) {
	var geocoder = new google.maps.Geocoder();
	geocoder.geocode({
		'address' : place,
		'region' : 'jp'
	}, function(results, status) {
		if (place == '現在地') {
			navigator.geolocation.getCurrentPosition(function success(position) {
				latlng = convertLatLng([position.coords.latitude, position.coords.longitude]);
				func();
				return;
			}, function error(error) {
				alert("search error");
			});
		} else {
			//var bounds = new google.maps.LatLngBounds();
			if (status == google.maps.GeocoderStatus.OK) {
				for (var i in results) {
					if (results[i].geometry) {
						// 緯度経度を取得
						latlng = results[i].geometry.location;
						func();
						return;
						// 住所を取得
						//var address = results[i].formatted_address.replace(/^日本, /, '');
						//bounds.extend(latlng);
					}
				}
			} else
				alert("search error");
		}
	});
}

function initialize() {
	viewWidth = $("#street_view_parent").css("width").replace("px", "");
	viewWidth *= 0.8;
	viewWidth = Math.round(viewWidth);
	viewHeight = viewWidth * 0.7;
	viewHeight = Math.round(viewHeight);

	directionsService = new google.maps.DirectionsService();

	mapCanvas = new google.maps.Map(document.getElementById('map_now'), {
		mapTypeId : google.maps.MapTypeId.ROADMAP,
		scrollwheel : false,
		scaleControl : true,
	});

	var rendererOptions = {
		map : mapCanvas,
		suppressMarkers : true
	};
	directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions);

	stepDisplay = new google.maps.InfoWindow();

	findRoute();
}

function findRoute() {
	for (var i = 0; i < markerArray.length; i++) {
		markerArray[i].setMap(null);
	}
	markerArray = [];

	// 車 or 歩き 用ルート検索
	var travelMode;
	if (isDriveMode()) {
		travelMode = google.maps.DirectionsTravelMode.DRIVING;
	} else {
		travelMode = google.maps.DirectionsTravelMode.WALKING;
	}
	var request = {
		origin : from,
		destination : to,
		travelMode : travelMode
	};

	directionsService.route(request, function(response, status) {
		if (status == google.maps.DirectionsStatus.OK) {
			directionsDisplay.setDirections(response);
			showSteps(response);
		}
	});
}

function showSteps(directionResult) {
	destRoute = directionResult.routes[0].legs[0];
	var length = destRoute.steps.length;

	// ストリートビューの初期化
	//document.getElementById("street_view_parent").innerHTML = "";
	$('#street_view_parent').empty();

	if (isMoveStreetViewMode()) {
		svpObjArray = [];
		for (var i = 0; i < length; i++) {
			if (i + 1 >= length) {
				showStepsMoveView(destRoute.steps[i], null, i);
			} else {
				showStepsMoveView(destRoute.steps[i], destRoute.steps[i + 1], i);
			}
		}
		// 2点から角度を計算しストリートビューに反映
		calcRadianMove(destRoute, 0);
	} else {
		pointObjArray = [];
		for (var i = 0; i < length; i++) {
			if (i + 1 >= length) {
				showStepsStaticView(destRoute.steps[i], null, i);
			} else {
				showStepsStaticView(destRoute.steps[i], destRoute.steps[i + 1], i);
			}
		}
	}

	var marker = new google.maps.Marker({
		position : destRoute.steps[length - 1].end_point,
		map : mapCanvas,
		icon : "https://chart.googleapis.com/chart?chst=d_map_pin_icon&chld=flag|ADDE63"
	});
	markerArray.push(marker);
}

function showStepsMoveView(fStep, tStep, index) {
	var annotation = createAnnotation(fStep, index, (tStep == null));
	//	document.getElementById("street_view_parent").innerHTML += annotation + "<div id=\"street_view" + index + "\" class=\"street\">";

	document.getElementById("street_view_parent").innerHTML += annotation + "<div id=\"street_view" + index + "\" style=\"width:" + viewWidth + "px; height:" + viewHeight + "px\"/>";
	if (tStep != null) {
		document.getElementById("street_view_parent").innerHTML += "<img src='./image/a.jpg' class=\"direct\"/>";
	}
}

function showStepsStaticView(fStep, tStep, index) {
	var defer = $.Deferred();

	var annotation = createAnnotation(fStep, index, (tStep == null));

	// 2点から角度を計算しストリートビューに反映
	$.when(calcRadianStatic(fStep, tStep, index, annotation)).done(function(pointObj) {
		innerPointObj(pointObj);
		defer.resolve();
	});
	return defer.promise();
}

function createAnnotation(step, index, isLast) {
	// 中間地点の数だけストリートビューを動的に生成
	// 次の中間地点へのアノテーション
	var instruction = step.instructions;
	if (isLast) {
		// 最後の中間地点→目的地 へはdivタグが入っているので取りのぞく
		instruction = validateInstructions(instruction);
	}
	var pText1 = "<p id=\"jump" + index + "\" style=\"text-align: left;\"><font size=\"+2\">" + index + " 地点:</font> <font size=\"+1\">" + instruction + "</font><\p>";

	// 次の中間地点までの距離
	var distance = step.distance.text;
	var pText2 = "<p style=\"text-align: left;\">";
	if (!isLast) {
		pText2 += String(index + 1) + " 地点";
	} else {
		// 最後の中間地点→目的地 の場合
		pText2 += "目的地";
	}
	pText2 += "まで " + distance + "</p>";

	return pText1 + pText2;
}

function innerPointObj(pointObj) {
	pointObjArray.push(pointObj);
	if (pointObjArray.length == destRoute.steps.length) {
		// 順不同で入っているのをソート
		pointObjArray.sort(function(p1, p2) {
			return p1.id - p2.id;
		});

		var length = pointObjArray.length;
		for (var i = 0; i < length; i++) {
			pointObj = pointObjArray[i];
			var id = pointObj.id;
			var annotation = pointObj.annotation;
			var radian = pointObj.radian;
			var latlng = pointObj.G + "," + pointObj.K;

			var staticImage = "<img class=\'street_img\' src=\"https://maps.googleapis.com/maps/api/streetview?size=" + viewWidth + "x" + viewHeight + "&location=" + latlng + "&heading=" + radian + "&pitch=0&fov=120&zoom=0\"/>";
			document.getElementById("street_view_parent").innerHTML += annotation + staticImage;
			if (i + 1 < length) {
				document.getElementById("street_view_parent").innerHTML += "<img src='./image/a.jpg' class=\"direct\" >";
			}
		}
	}
}

function calcRadianMove(destRoute, i) {
	var icon = "https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=" + i + "|FF0000|000000";
	var fPoint, tPoint;
	if (i + 1 < destRoute.steps.length) {
		// 現在の中間地点，次の中間地点
		fPoint = destRoute.steps[i].lat_lngs[0];
		tPoint = destRoute.steps[i + 1].lat_lngs[0];
	} else {
		// 最後の中間地点，目的地
		fPoint = destRoute.steps[i].lat_lngs[0];
		tPoint = to;
	}

	// 座標を c1.web.app.JaxAdapterへ飛ばし，角度を計算
	$.ajax({
		url : endpoint + '/radian',
		dataType : "json",
		data : {
			fromX : fPoint.lng(),
			fromY : fPoint.lat(),
			toX : tPoint.lng(),
			toY : tPoint.lat(),
		},
		success : function(radian) {
			// java側から角度が返ってきた場合，ストリートビューの生成と共に初期角度を反映
			var marker = new google.maps.Marker({
				position : fPoint,
				map : mapCanvas,
				icon : icon
			});

			attachInstructionText(marker, destRoute.steps[i].instructions, i);
			markerArray.push(marker);
			showMoveStreetView(fPoint, i, radian);

			if (i + 1 < destRoute.steps.length) {
				// 再帰で全中間地点を表示していく
				// 再帰を使わず，for文などで回すと動かない
				calcRadianMove(destRoute, i + 1);
			} else {
				// 0番目のアイコンをクリックする (動作していないっぽい)
				google.maps.event.trigger(markerArray[0], 'click');

				// 表示する中間地点がなくなった場合
				// 表示してきたストリートビューを後ろへずらす
				moveSVP(0);
			}
		}
	});
}

function calcRadianStatic(fStep, tStep, index, annotation) {
	var defer = $.Deferred();

	var icon = "https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=" + index + "|FF0000|000000";
	var fPoint, tPoint;
	if (tStep != null) {
		// 現在の中間地点，次の中間地点
		fPoint = fStep.lat_lngs[0];
		tPoint = tStep.lat_lngs[0];
	} else {
		// 最後の中間地点，目的地
		fPoint = fStep.lat_lngs[0];
		tPoint = to;
	}

	// 座標を c1.web.app.JaxAdapterへ飛ばし，角度を計算
	$.ajax({
		url : endpoint + '/radian',
		dataType : "json",
		data : {
			fromX : fPoint.lng(),
			fromY : fPoint.lat(),
			toX : tPoint.lng(),
			toY : tPoint.lat(),
		},
		success : function(radian) {
			// java側から角度が返ってきた場合，ストリートビューの生成と共に初期角度を反映
			var marker = new google.maps.Marker({
				position : fPoint,
				map : mapCanvas,
				icon : icon
			});

			attachInstructionText(marker, fStep.instructions, index);
			markerArray.push(marker);

			var pointObj = {
				id : index,
				annotation : annotation,
				radian : radian,
				G : fPoint.lat(),
				K : fPoint.lng()
			};
			defer.resolve(pointObj);
		}
	});
	return defer.promise();
}

function showMoveStreetView(point, index, radian) {
	var street_view = document.getElementById("street_view" + index);

	var sv_map = new google.maps.Map(street_view, {
		mapTypeId : google.maps.MapTypeId.ROADMAP,
		scrollwheel : false,
		scaleControl : true,
	});

	var svp = new google.maps.StreetViewPanorama(street_view, {
		position : point,
		pov : {
			heading : radian, // java側で計算した角度
			pitch : 0, // 斜め上
			zoom : 0	// ズームアウト
		},
		addressControl : true,
		disableDoubleClickZoom : true,
		enableCloseButton : false,
		panControl : false,
		scrollwheel : false,
		zoomControl : false,
		linksControl : true,

		// falseにしないとmoveSVP()が動かない
		navigationControl : false,
	});

	var svpObj = {
		svp : svp,
		// svp.getPov().heading
		radian : radian,
		isMoved : false,
	};
	svpObjArray.push(svpObj);

	sv_map.setStreetView(svp);
}

function moveSVP(index) {
	var svp = svpObjArray[index].svp;

	// listenerを介さないとlinks(繋がっているストリートビュー)が取れない  (謎)
	// panorama生成時に呼ばれている
	svp.addListener('links_changed', function() {
		var svpObj = getSvpObj(svp);
		if (svpObj.isMoved == false) {
			// 動いたかをフラグ管理しなければ再度listenerが呼ばれ無限ループに入る
			svpObj.isMoved = true;

			var opposite;
			var radian = Number(svpObj.radian);
			if (radian < 180) {
				opposite = radian + 180;
			} else {
				opposite = radian - 180;
			}

			var links = svp.getLinks();
			var length = links.length;
			for (var i = 0; i < length; i++) {
				var heading = links[i].heading;
				// 向いている角度と正反対の角度(opposite)のプラマイ15度以内にlinkがあるなら、そこへ動く
				if (opposite - 15 <= heading && heading <= opposite + 15) {
					svp.setPano(links[i].pano);
					//					console.log(svpObj.svp);
					return;
				}
			}
		}
	});

	index++;
	if (index < svpObjArray.length) {
		// for/while文のループ処理では期待通りに動作しないので，再帰
		moveSVP(index);
	}
}

function getSvpObj(svp) {
	var id = svp.j;
	var length = svpObjArray.length;
	for (var i = 0; i < length; i++) {
		if (svpObjArray[i].svp.j == id) {
			return svpObjArray[i];
		}
	}
	return null;
}

function attachInstructionText(marker, text, index) {
	google.maps.event.addListener(marker, 'click', function(e) {
		stepDisplay.setContent(text);
		stepDisplay.open(mapCanvas, marker);
		scrollpoint(index);
		// スクロール処理
	});
}

function validateInstructions(annotation) {
	// 半角スペース * 3
	annotation = annotation.replace("<div style=\"font-size:0.9em\">", "&nbsp;&nbsp;&nbsp;");
	return annotation.replace("</div>", "");
}

// スクロール処理の関数
// indexのところへ画面をスクロールさせる
function scrollpoint(index) {
	document.getElementById("jump" + index.toString()).scrollIntoView(true);
}

function isDriveMode() {
	return document.getElementById('drive').checked;
}

function isMoveStreetViewMode() {
	return document.getElementById('move_on').checked;
}