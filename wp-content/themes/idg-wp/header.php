<?php
/**
 * The header for our theme
 *
 * This is the template that displays all of the <head> section and everything up until <div id="content">
 *
 * @link https://developer.wordpress.org/themes/basics/template-files/#template-partials
 *
 * @package Identidade_Digital_do_Governo_-_WordPress
 */

?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <meta name="viewport" content="width=device-width, initial-scale=0, shrink-to-fit=no">

	<link rel="profile" href="https://gmpg.org/xfn/11">
	<link rel="apple-touch-icon" sizes="180x180" href="<?php echo get_template_directory_uri(); ?>/assets/img/favicons/apple-touch-icon.png" />
	<link rel="icon" type="image/png" sizes="32x32" href="<?php echo get_template_directory_uri(); ?>/assets/img/favicons/favicon-32x32.png" />
	<link rel="icon" type="image/png" sizes="16x16" href="<?php echo get_template_directory_uri(); ?>/assets/img/favicons/favicon-16x16.png" />
	<link rel="manifest" href="<?php echo get_template_directory_uri(); ?>/assets/manifest.json" />

	<?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>

<a class="skip-link sr-only" href="#main">
    <?php esc_html_e( 'Skip to content', 'idg-wp' ); ?>
</a>

<header id="main-header">
	<div id="barra-brasil"></div>
	<div class="container">
		<div class="row">
			<h1>LABB MINC</h1>
			<div class="col-md-6 col-lg-8 title-wrapper">
				<p class="site-denomination mb-0"><?php bloginfo( 'description' ); ?></p>
				<h1 class="site-title mt-0 mb-0"><a href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home"><?php bloginfo( 'name' ); ?></a></h1>
			</div>
			<div class="col-md-6 col-lg-4 d-none d-md-block">
				<ul id="accessibility-bar" class="text-right">
					<li class="high-contrast">
						<a href="#" id="high-contrast-btn">Alto contraste</a>
					</li>
					<li class="vlibras">
						<a href="http://www.vlibras.gov.br/" target="_blank">VLibras</a>
					</li>
				</ul>
			</div>
		</div>

		<div class="row">
			<div class="col-sm-1 col-md-8 col-lg-9 menu-wrapper">
				<nav id="featured-links">
					<button id="menu-toggle" class="hidden-sm-down" data-toggle="collapse" data-target="#menu-wrapper" aria-controls="primary-menu" aria-expanded="false">
						<span class="sr-only"><?php esc_html_e( 'Primary Menu', 'idg-wp' ); ?></span>
					</button>
					<?php
					$menu_args = array(
						'menu'              => 'featured-links',
						'theme_location'    => 'featured-links',
						'depth'             => 1,
						'container'         => '',
						'menu_class'   => 'nav d-none d-md-flex',
					);
					wp_nav_menu($menu_args); ?>
				</nav>
			</div>
			<div class="col-sm-11 col-md-4 col-lg-3 search-wrapper">
				<?php get_search_form(); ?>
			</div>
		</div>
		<div id="menu-wrapper" class="collapse clearfix">
			<div class="menu-content container">
				<div class="row">

					<?php
					if ( is_active_sidebar( 'main-menu-area' ) ) :
						dynamic_sidebar( 'main-menu-area' );
					endif;
					?>

				</div>
			</div>
		</div>
	</div>
</header>
