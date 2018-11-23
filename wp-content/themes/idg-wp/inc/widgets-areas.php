<?php
/**
 * Register widgets area.
 *
 * @link https://developer.wordpress.org/themes/functionality/sidebars/#registering-a-sidebar
 */
function pp_wp_widgets_init() {
	register_sidebar( array(
		'name'          => esc_html__( 'Main menu area', 'idg-wp' ),
		'id'            => 'main-menu-area',
		'description'   => esc_html__( 'Add widgets here.', 'idg-wp' ),
		'before_widget' => '<div id="%1$s" class="col %2$s"><div class="menu-col">',
		'after_widget'  => '</div></div>',
		'before_title'  => '<h3 class="menu-title">',
		'after_title'   => '</h3>',
	) );

	register_sidebar( array(
		'name' => esc_html__( 'Footer Area', 'idg-wp' ),
		'id' => 'footer-widgets-area',
		'description'   => esc_html__( 'Add widgets here.', 'idg-wp' ),
		'before_widget' => '<div id="%1$s" class="col %2$s"><div class="menu-col">',
		'after_widget'  => '</div></div>',
		'before_title'  => '<h4 class="section-title">',
		'after_title'   => '</h4>',
	) );

	register_sidebar( array(
		'name' => esc_html__( 'Services Section', 'idg-wp' ),
		'id' => 'services-widgets-area',
		'description'   => esc_html__( 'Add widgets here.', 'idg-wp' ),
		'before_widget' => '<div id="%1$s" class="col %2$s"><div class="menu-col">',
		'after_widget'  => '</div></div>',
		'before_title'  => '<h4 class="section-title">',
		'after_title'   => '</h4>',
	) );
}
add_action( 'widgets_init', 'pp_wp_widgets_init' );
