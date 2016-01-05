package c1.web.app.model;

import javax.xml.bind.annotation.XmlRootElement;

import c1.web.app.attr.Attr;

/**
 * ある場所のxy地点，および角度計算時の始点か終点かを保持するもの
 *
 * @author nishimura
 */
// 現状enum使ってない
@XmlRootElement(name = Attr.RADIAN_NAME)
public class Position {
	private double x, y;
	private Position.Type type;

	public enum Type {
		FROM, TO
	}

	public Position(double x, double y, Position.Type type) {
		this.x = x;
		this.y = y;
		this.type = type;
	}

	public double getX() {
		return x;
	}

	public double getY() {
		return y;
	}

	public boolean isFrom(){
		return type == Position.Type.FROM;
	}

	public boolean isTo(){
		return type == Position.Type.TO;
	}

	public String toString() {
		StringBuilder strBuil = new StringBuilder();
		strBuil.append("x:").append(x);
		strBuil.append(" ");
		strBuil.append("y: ").append(y);
		return strBuil.toString();
	}
}
