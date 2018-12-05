<?php

class IDGWP_Customize
{
	/**
	 * Identifier, namespace
	 */
	protected $theme_key = '';

	/**
	 * The option value in the database will be based on get_stylesheet()
	 * so child themes don't share the parent theme's option value.
	 */
	protected $option_key = '';

	/**
	 * Initialize
	 *
	 * @param null $args
	 */
	public function __construct( $args = null )
	{
		// Set option key based on get_stylesheet()
		if ( null === $args ) {
			$args['theme_key'] = strtolower( get_stylesheet() );
		}
		// Set option key based on get_stylesheet()
		$this->theme_key  = $args['theme_key'];
		$this->option_key = $this->theme_key . '_theme_options';
		// register our custom settings
		add_action( 'customize_register', array( $this, 'customize_register' ) );
		// Scripts for Preview
		add_action( 'customize_preview_init', array( $this, 'customize_preview_js' ) );
	}

	/**
	 * Returns the default options.
	 * Use the hook 'documentation_default_theme_options' for change via plugin
	 *
	 * @since    08/09/2012
	 *
	 * @param null $value
	 *
	 * @return Array
	 */
	public function get_default_theme_options( $value = null )
	{
		$default_theme_options = array(
			'echo_desc'    => '1',
			'layout'       => 'sidebar-right',
			'rewrite_url'  => 'wp-admin/edit.php',
			'color_scheme' => 'light',
			'text_color'   => '#111',
			'link_color'   => '#0100BE'
		);
		if ( null !== $value ) {
			return $default_theme_options[ $value ];
		}

		return apply_filters( $this->theme_key . '_default_theme_options', $default_theme_options );
	}

	/**
	 * Returns the options array.
	 *
	 * @since    08/09/2012
	 *
	 * @param null $value
	 *
	 * @return Array
	 */
	public function get_theme_options( $value = null )
	{
		$saved    = (array) get_option( $this->option_key );
		$defaults = $this->get_default_theme_options();
		$options  = wp_parse_args( $saved, $defaults );
		$options  = array_intersect_key( $options, $defaults );
		$options  = apply_filters( $this->theme_key . '_theme_options', $options );
		if ( null !== $value ) {
			return $options[ $value ];
		}

		return $options;
	}

	/**
	 * Implement theme options into Theme Customizer on Frontend
	 *
	 * @see     examples for different input fields https://gist.github.com/2968549
	 * @since   08/09/2012
	 *
	 * @param   $wp_customize  Theme Customizer object
	 *
	 * @return  void
	 */
	public function customize_register( $wp_customize )
	{

		$defaults = $this->get_default_theme_options();

		// Remove unnecessary items
		$wp_customize->remove_section('header_image');
		$wp_customize->remove_control('show_on_front');

		// defaults, import for live preview with js helper
		$wp_customize->get_setting( 'blogname' )->transport        = 'postMessage';
		$wp_customize->get_setting( 'blogdescription' )->transport = 'postMessage';

		// Changes default items
		$wp_customize->add_section( 'static_front_page', array(
			'title'          => __( 'Front page settings', 'idg-wp' ),
			'priority'       => 120,
			'description'    => __( 'Here you can find options to changes the look and feel for front page.', 'idg-wp' ),
		) );

		// Add settings for output description
		/*$wp_customize->add_setting( $this->option_key . '[echo_desc]', array(
			'default'    => $defaults['echo_desc'],
			'type'       => 'option',
			'capability' => 'edit_theme_options'
		) );*/

		// Add control and output for select field
		/*$wp_customize->add_control( $this->option_key . '_echo_desc', array(
			'label'    => esc_attr__( 'Display Description', 'idg-wp' ),
			'section'  => 'title_tagline',
			'settings' => $this->option_key . '[echo_desc]',
			'std'      => '1',
			'type'     => 'checkbox',
		) );*/

		// ===== Layout Section =====
		// Option for leave sidebar left or right
		/*$wp_customize->add_section( $this->option_key . '_layout', array(
			'title'       => esc_attr__( 'Layout', 'idg-wp' ),
			'description' => esc_attr__( 'Define main Layout', 'idg-wp' ),
			'priority'    => 30
		) );*/

		// Add field for radio buttons to set layout
		/*$wp_customize->add_setting( $this->option_key . '[layout]', array(
			'default'    => $defaults['layout'],
			'type'       => 'option',
			'capability' => 'edit_theme_options',
		) );*/

		// Add control and output for select field
		/*$wp_customize->add_control( $this->option_key . '_layout', array(
			'label'    => esc_attr__( 'Color Scheme', 'idg-wp' ),
			'section'  => $this->option_key . '_layout',
			'settings' => $this->option_key . '[layout]',
			'type'     => 'radio',
			'choices'  => array(
				'sidebar-left'  => esc_attr__( 'Sidebar on left', 'idg-wp' ),
				'sidebar-right' => esc_attr__( 'Sidebar on right', 'idg-wp' )
			),
		) );*/

		// ===== Custom Section =====
		// create custom section for rewrite url
		/*$wp_customize->add_section( $this->option_key . '_rewrite_url', array(
			'title'    => esc_attr__( 'Rewrite', 'idg-wp' ),
			'priority' => 35,
		) );*/

		// ===== Text Input Field =====
		// add field for rewrite url in custom section
		/*$wp_customize->add_setting( $this->option_key . '[rewrite_url]', array(
			'default'    => $defaults['rewrite_url'],
			'type'       => 'option',
			'capability' => 'edit_theme_options',
		) );*/

		// ===== Textarea Field via Custom Field =====
		// !!! Current NOT use, use the textarea field, see below.
		// use the custom class for add textarea and use it on this example
		/*
		$wp_customize->add_control( $this->option_key . '_rewrite_url', array(
			'label'      =>esc_attr__( 'Rewrite URL', 'idg-wp' ),
			'section'    => $this->option_key . '_rewrite_url',
			'settings'   => $this->option_key . '[rewrite_url]',
			'type'       => 'text',
		) );
		*/

		// add textarea field for change the rewrite url
		/*$wp_customize->add_control( $this->option_key . '_rewrite_url', array(
			'label'    => esc_attr__( 'Rewrite URL', 'idg-wp' ),
			'section'  => $this->option_key . '_rewrite_url',
			'settings' => $this->option_key . '[rewrite_url]',
			'type'     => 'textarea',
		) );*/

		// ===== Sample Radio Buttons Fields =====
		// Add field for radio buttons to dark or light scheme
		/*$wp_customize->add_setting( $this->option_key . '[color_scheme]', array(
			'default'    => $defaults['color_scheme'],
			'type'       => 'option',
			'capability' => 'edit_theme_options',
		) );*/

		// ===== Color picker Fields =====
		// add field for text color in default section for 'colors'
		/*$wp_customize->add_setting( $this->option_key . '[text_color]', array(
			'default'    => $defaults['text_color'],
			'type'       => 'option',
			'capability' => 'edit_theme_options',
		) );*/

		// add color field include color picker for text color
		/** @noinspection PhpParamsInspection */
		/*$wp_customize->add_control( new WP_Customize_Color_Control( $wp_customize, $this->option_key . '_text_color', array(
			'label'    => esc_attr__( 'Text Color', 'idg-wp' ),
			'section'  => 'colors',
			'settings' => $this->option_key . '[text_color]',
		) ) );*/

		// add field for text color in default section for 'colors'
		/*$wp_customize->add_setting( $this->option_key . '[link_color]', array(
			'default'    => $defaults['link_color'],
			'type'       => 'option',
			'capability' => 'edit_theme_options',
		) );*/

		// add color field include color picker for link color
		/*$wp_customize->add_control( new WP_Customize_Color_Control( $wp_customize, $this->option_key . '_link_color', array(
			'label'    => esc_attr__( 'Link Color', 'idg-wp' ),
			'section'  => 'colors',
			'settings' => $this->option_key . '[link_color]',
		) ) );*/

		// Add control and output for select field
		/*$wp_customize->add_control( $this->option_key . '_color_scheme', array(
			'label'    => esc_attr__( 'Color Scheme', 'idg-wp' ),
			'section'  => 'colors',
			'settings' => $this->option_key . '[color_scheme]',
			'type'     => 'radio',
			'choices'  => array(
				'dark'  => esc_attr__( 'Dark', 'idg-wp' ),
				'light' => esc_attr__( 'Light', 'idg-wp' )
			),
		) );*/

		// TODO
		$wp_customize->add_setting( $this->option_key . '_main_carousel', array(
			'default'    => $defaults['_main_carousel'],
			'type'       => 'option',
			'capability' => 'edit_theme_options',
			'transport'   => 'postMessage',
		) );

		$post_categories = get_categories();
		$cats = [];
		foreach( $post_categories as $category ) {
			$cats[$category->slug] = $category->name;
		}

		$wp_customize->add_control( $this->option_key . '_main_carousel', array(
			'label'    => esc_attr__( 'Main carousel categories', 'idg-wp' ),
			'section'  => 'static_front_page',
			'settings' => $this->option_key . '_main_carousel',
			'type'     => 'select',
			'choices'  => $cats,
		) );

		$wp_customize->selective_refresh->add_partial( $this->option_key . '_main_carousel', array(
			'selector'        => '#jumbotron-carousel',
			// 'render_callback' =>  array( $this, 'idg_wp_customize_partial_main_carousel' ),
		) );

		$wp_customize->add_setting( $this->option_key . '_main_carousel_slides', array(
			'default'    => $defaults['_main_carousel_slides'],
			'type'       => 'option',
			'capability' => 'edit_theme_options',
			'transport'   => 'postMessage',
		) );

		$wp_customize->add_control( $this->option_key . '_main_carousel_slides', array(
			'label'    => esc_attr__( 'Number of slides to show', 'idg-wp' ),
			'section'  => 'static_front_page',
			'settings' => $this->option_key . '_main_carousel_slides',
			'type'     => 'number'
		) );

		$wp_customize->selective_refresh->add_partial( $this->option_key . '_main_carousel_slides', array(
			'selector'        => '#jumbotron-carousel',
		) );

		// TODO
		$wp_customize->add_setting( $this->option_key . '_news_sections', array(
			'default'    => $defaults['_news_sections'],
			'type'       => 'option',
			'capability' => 'edit_theme_options',
			'transport'   => 'postMessage',
		) );

		$wp_customize->add_control( $this->option_key . '_news_sections', array(
			'label'    => esc_attr__( 'News sections category', 'idg-wp' ),
			'section'  => 'static_front_page',
			'settings' => $this->option_key . '_news_sections',
			'type'     => 'select',
			'choices'  => $cats,
		) );

		$wp_customize->selective_refresh->add_partial( $this->option_key . '_news_sections', array(
			'selector'        => '#noticias',
		) );

		$wp_customize->add_setting( $this->option_key . '_news_sections_items', array(
			'default'    => $defaults['_news_sections_items'],
			'type'       => 'option',
			'capability' => 'edit_theme_options',
			'transport'   => 'postMessage',
		) );

		$wp_customize->add_control( $this->option_key . '_news_sections_items', array(
			'label'    => esc_attr__( 'Number of items to show', 'idg-wp' ),
			'section'  => 'static_front_page',
			'settings' => $this->option_key . '_news_sections_items',
			'type'     => 'number'
		) );

		$wp_customize->selective_refresh->add_partial( $this->option_key . '_news_sections_items', array(
			'selector'        => '#noticias',
		) );

		// wp_die( $wp_customize->get_setting( $this->option_key . '_main_carousel' ) );
	}

	/**
	 * Mp reload for changes
	 *
	 * @since    10/02/2012
	 * @return   void
	 */
	public function customize_preview_js() {
		// $suffix = defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ? '.dev' : '';
		wp_register_script(
			$this->theme_key . '-customizer',
			// get_template_directory_uri() . '/js/theme-customizer' . $suffix . '.js',
			get_template_directory_uri() . '/assets/js/dist/idg-wp-customizer.min.js',
			array( 'customize-preview' ),
			false,
			true
		);
		wp_enqueue_script( $this->theme_key . '-customizer' );

		wp_localize_script( $this->theme_key . '-customizer', 'idgCustomizer', array(
				'ajaxurl' => admin_url( 'admin-ajax.php' )
			)
		);
	}

	public function idg_wp_customize_partial_main_carousel($param)
	{
		echo 'Foobar ' . $param;
	}

} // end class
$documentation_customize = new IDGWP_Customize();
