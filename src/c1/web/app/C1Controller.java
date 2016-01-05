package c1.web.app;

import c1.web.app.model.Position;
import c1.web.app.model.Radian;

/**
 * JaxAdapterを経由して送られてきた値を処理するもの
 *
 * @author nishimura
 */
public class C1Controller {

	private Position from, to;
	private Radian radian;

	public C1Controller() {
	}

	public void radian(double fromX, double fromY, double toX, double toY) {
		from = createPoint(fromX, fromY, Position.Type.FROM);
		to = createPoint(toX, toY, Position.Type.TO);
		radian = new Radian(from,to);
	}

	public double getRadian(){
		return radian.getRadian();
	}

	private Position createPoint(double x, double y, Position.Type type) {
		return new Position(x, y, type);
	}

}
