<?php
/**
 * Register our Feature Card Widget
 *
 */
function register_feature_card() {
	register_widget( 'Feature_Card' );
}
add_action( 'widgets_init', 'register_feature_card' );

class Feature_Card extends WP_Widget {

	function __construct() {
		parent::__construct(
			'feature_card',
			esc_html__( 'Feature Card', 'idg-wp' ),
			array( 'description' => esc_html__( 'A Foo Widget', 'idg-wp' ) )
		);
	}

	public function widget( $args, $instance ) { ?>

		<div class="col-sm-12 col-md-6 col-lg-3 text-center mb-4">
			<div class="feature-card static-height">
				<a href="<?php echo ! empty( $instance['link'] ) ? $instance['link'] : ''; ?>" <?php echo ! empty( $instance['target'] ) ? 'target="_blank"' : ''; ?>>
					<div class="align">
						<div class="icon <?php echo $instance['icon']; ?>"></div>
						<h3 class="card-title">
							<?php echo ! empty( $instance['title'] ) ? $instance['title'] : ''; ?>
						</h3>
					</div>
				</a>
			</div>
		</div>

		<?php
	}

	public function form( $instance ) {
		$title  = ! empty( $instance['title'] ) ? $instance['title'] : esc_html__( 'Feature Card', 'idg-wp' );
		$link   = ! empty( $instance['link'] ) ? $instance['link'] : '';
		$target = ! empty( $instance['target'] ) ? $instance['target'] : '';
		$icon   = ! empty( $instance['icon'] ) ? $instance['icon'] : ''; ?>
		<div class="idg-feature-card-widget">
			<p>
				<label for="<?php echo esc_attr( $this->get_field_id( 'title' ) ); ?>"><?php esc_attr_e( 'Title:', 'idg-wp' ); ?></label>
				<input class="widefat card-title" id="<?php echo esc_attr( $this->get_field_id( 'title' ) ); ?>" name="<?php echo esc_attr( $this->get_field_name( 'title' ) ); ?>" type="text" value="<?php echo esc_attr( $title ); ?>">
			</p>
			<p>
				<label for="<?php echo esc_attr( $this->get_field_id( 'link' ) ); ?>"><?php esc_attr_e( 'Link:', 'idg-wp' ); ?></label>
				<input class="widefat card-link" id="<?php echo esc_attr( $this->get_field_id( 'link' ) ); ?>" name="<?php echo esc_attr( $this->get_field_name( 'link' ) ); ?>" type="text" value="<?php echo esc_attr( $link ); ?>">
			</p>
			<p>
				<label for="<?php echo esc_attr( $this->get_field_id( 'target' ) ); ?>"><?php esc_attr_e( 'Open in new window:', 'idg-wp' ); ?></label>
				<input class="card-target" id="<?php echo esc_attr( $this->get_field_id( 'target' ) ); ?>" name="<?php echo esc_attr( $this->get_field_name( 'target' ) ); ?>" type="checkbox" value="1" <?php checked( '1', $target, true ); ?>>
			</p>
			<p>
				<label for="<?php echo esc_attr( $this->get_field_id( 'icon' ) ); ?>"><?php esc_attr_e( 'Select the icon:', 'idg-wp' ); ?></label>
				<select class="widefat icon-selector" id="<?php echo esc_attr( $this->get_field_id( 'icon' ) ); ?>" name="<?php echo esc_attr( $this->get_field_name( 'icon' ) ); ?>">
					<option <?php echo $icon == 'icon-plus' ? 'selected' : ''; ?> value="icon-plus">plus</option>
					<option <?php echo $icon == 'icon-calendar' ? 'selected' : ''; ?> value="icon-calendar">calendar</option>
					<option <?php echo $icon == 'icon-editais' ? 'selected' : ''; ?> value="icon-editais">editais</option>
					<option <?php echo $icon == 'icon-clock' ? 'selected' : ''; ?> value="icon-clock">clock</option>
					<option <?php echo $icon == 'icon-location' ? 'selected' : ''; ?> value="icon-location">location</option>
					<option <?php echo $icon == 'icon-search' ? 'selected' : ''; ?> value="icon-search">search</option>
					<option <?php echo $icon == 'icon-libras' ? 'selected' : ''; ?> value="icon-libras">libras</option>
					<option <?php echo $icon == 'icon-contrast' ? 'selected' : ''; ?> value="icon-contrast">contrast</option>
					<option <?php echo $icon == 'icon-play_btn' ? 'selected' : ''; ?> value="icon-play_btn">play_btn</option>
					<option <?php echo $icon == 'icon-arrow_down' ? 'selected' : ''; ?> value="icon-arrow_down">arrow_down</option>
					<option <?php echo $icon == 'icon-arrow_top' ? 'selected' : ''; ?> value="icon-arrow_top">arrow_top</option>
					<option <?php echo $icon == 'icon-arrow_left' ? 'selected' : ''; ?> value="icon-arrow_left">arrow_left</option>
					<option <?php echo $icon == 'icon-arrow_right' ? 'selected' : ''; ?> value="icon-arrow_right">arrow_right</option>
					<option <?php echo $icon == 'icon-angle_left' ? 'selected' : ''; ?> value="icon-angle_left">angle_left</option>
					<option <?php echo $icon == 'icon-angle_up' ? 'selected' : ''; ?> value="icon-angle_up">angle_up</option>
					<option <?php echo $icon == 'icon-angle_right' ? 'selected' : ''; ?> value="icon-angle_right">angle_right</option>
					<option <?php echo $icon == 'icon-angle_down' ? 'selected' : ''; ?> value="icon-angle_down">angle_down</option>
					<option <?php echo $icon == 'icon-economia-criativa' ? 'selected' : ''; ?> value="icon-economia-criativa">economia-criativa</option>
					<option <?php echo $icon == 'icon-dados-br' ? 'selected' : ''; ?> value="icon-dados-br">dados-br</option>
					<option <?php echo $icon == 'icon-ouvidoria' ? 'selected' : ''; ?> value="icon-ouvidoria">ouvidoria</option>
					<option <?php echo $icon == 'icon-consultas-publicas' ? 'selected' : ''; ?> value="icon-consultas-publicas">consultas-publicas</option>
					<option <?php echo $icon == 'icon-fale-conosco' ? 'selected' : ''; ?> value="icon-fale-conosco">fale-conosco</option>
					<option <?php echo $icon == 'icon-multimidia' ? 'selected' : ''; ?> value="icon-multimidia">multimidia</option>
					<option <?php echo $icon == 'icon-publicacoes' ? 'selected' : ''; ?> value="icon-publicacoes">publicacoes</option>
					<option <?php echo $icon == 'icon-noticias' ? 'selected' : ''; ?> value="icon-noticias">noticias</option>
					<option <?php echo $icon == 'icon-assessoria' ? 'selected' : ''; ?> value="icon-assessoria">assessoria</option>
					<option <?php echo $icon == 'icon-escritorios-regionais' ? 'selected' : ''; ?> value="icon-escritorios-regionais">escritorios-regionais</option>
					<option <?php echo $icon == 'icon-legislacao' ? 'selected' : ''; ?> value="icon-legislacao">legislacao</option>
					<option <?php echo $icon == 'icon-acoes-programadas' ? 'selected' : ''; ?> value="icon-acoes-programadas">acoes-programadas</option>
					<option <?php echo $icon == 'icon-internacional' ? 'selected' : ''; ?> value="icon-internacional">internacional</option>
					<option <?php echo $icon == 'icon-vinculadas' ? 'selected' : ''; ?> value="icon-vinculadas">vinculadas</option>
					<option <?php echo $icon == 'icon-secretarias' ? 'selected' : ''; ?> value="icon-secretarias">secretarias</option>
					<option <?php echo $icon == 'icon-ministerio' ? 'selected' : ''; ?> value="icon-ministerio">ministerio</option>
					<option <?php echo $icon == 'icon-ministro' ? 'selected' : ''; ?> value="icon-ministro">ministro</option>
					<option <?php echo $icon == 'icon-pontos-cultura' ? 'selected' : ''; ?> value="icon-pontos-cultura">pontos-cultura</option>
					<option <?php echo $icon == 'icon-centros-culturais' ? 'selected' : ''; ?> value="icon-centros-culturais">centros-culturais</option>
					<option <?php echo $icon == 'icon-patrimonio' ? 'selected' : ''; ?> value="icon-patrimonio">patrimonio</option>
					<option <?php echo $icon == 'icon-apoio' ? 'selected' : ''; ?> value="icon-apoio">apoio</option>
					<option <?php echo $icon == 'icon-lei-rouanet' ? 'selected' : ''; ?> value="icon-lei-rouanet">lei-rouanet</option>
					<option <?php echo $icon == 'icon-snc' ? 'selected' : ''; ?> value="icon-snc">snc</option>
				</select>
			</p>

			<div class="feature-card static-height">
				<div class="align">
					<div class="icon <?php echo $icon; ?>"></div>
					<h3 class="card-title"><?php echo $title; ?></h3>
				</div>
			</div>
		</div>
		<?php
	}

	public function update( $new_instance, $old_instance ) {
		$instance           = array();
		$instance['title']  = ( ! empty( $new_instance['title'] ) ) ? sanitize_text_field( $new_instance['title'] ) : '';
		$instance['link']   = ( ! empty( $new_instance['link'] ) ) ? sanitize_text_field( $new_instance['link'] ) : '';
		$instance['target'] = ( ! empty( $new_instance['target'] ) ) ? sanitize_text_field( $new_instance['target'] ) : '';
		$instance['icon']   = ( ! empty( $new_instance['icon'] ) ) ? sanitize_text_field( $new_instance['icon'] ) : '';

		return $instance;
	}

}
