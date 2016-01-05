package c1.web.app;

import java.net.URI;
import java.net.URISyntaxException;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import c1.web.app.attr.Attr;

@Path("/")
public class JaxAdapter {

	private final C1Controller controller = new C1Controller();

	@GET
	@Produces({ MediaType.APPLICATION_JSON })
	@Path(Attr.RADIAN_URL)
	public Response radian(@QueryParam("fromX") double fromX,
			@QueryParam("fromY") double fromY, @QueryParam("toX") double toX,
			@QueryParam("toY") double toY) {
		controller.radian(fromX, fromY, toX, toY);

		// JSONで値を返す際はこうするといいらしい  **なんか動く**
		String r = String.valueOf(controller.getRadian());
		return Response.ok(r, MediaType.APPLICATION_JSON).build();
	}

	/**
	 * ./api/ へのアクセスを ./api/application.wadl（APIの仕様書） にリダイレクトする
	 *
	 * @return
	 * @throws URISyntaxException
	 */
	@GET
	@Path("/")
	public Response redirect() throws URISyntaxException {
		URI uri = new URI("application.wadl");
		return Response.seeOther(uri).build();
	}

}
