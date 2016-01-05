jQuery(function($) {

	// gps に対応しているかチェック
	if (!navigator.geolocation) {
		$('#map_now').text('GPSに対応したブラウザでお試しください');
		return false;
	}
	// gps取得開始
	navigator.geolocation.getCurrentPosition(function(pos) {
		// gps 取得成功
		// google map 初期化
		var gmap = new google.maps.Map($('#map_now').get(0), {
			center : new google.maps.LatLng(35, 135),
			mapTypeId : google.maps.MapTypeId.ROADMAP,
			zoom : 17
		});

		// 現在位置にピンをたてる
		var currentPos = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
		var currentMarker = new google.maps.Marker({
			position : currentPos
		});
		currentMarker.setMap(gmap);

		// 現在地にスクロールさせる
		gmap.panTo(currentPos);

	}, function() {
		// gps 取得失敗
		$('#map_now').text('GPSデータを取得できませんでした');
		return false;
	});
});
