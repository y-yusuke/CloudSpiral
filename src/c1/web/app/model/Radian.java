package c1.web.app.model;

/**
 * 2つの地点から角度を計算するもの
 *
 * @author nishimura
 */
public class Radian {

	private double radian;

	public Radian(Position from, Position to) {
		radian = calcRadian(from, to);
	}

	public double getRadian() {
		return radian;
	}

	private double calcRadian(Position from, Position to) {
		// BigDecimal 使ってもいいかも

		double fx = from.getX(), fy = from.getY();
		double tx = to.getX(), ty = to.getY();

		double radian = Math.atan2(tx - fx, ty - fy);
		radian = radian * 180d / Math.PI;
		return validate(radian, fx, tx);
	}

	private double validate(double radian, double fx, double tx) {
		if (Double.compare(fx, tx) <= 0) {
			// 第一象限 or 第四象限
			// radianの値をそのまま使用可能
			return radian;
		} else {
			// 第二象限 or 第三象限
			// radianの値がマイナスなので，0 <= r <= 360 の間に当てはまるように変更
			return radian + 360;
		}
	}

}
