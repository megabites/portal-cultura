<?php
/**
 * The template for displaying archive pages
 *
 * @link https://developer.wordpress.org/themes/basics/template-hierarchy/
 *
 * @package Identidade_Digital_do_Governo_-_WordPress
 */

get_header();
?>

	<main id="events-archive" class="site-main">
		<div class="container">
			<div class="row">
				<?php the_breadcrumb(); ?>
			</div>
			<div class="row">
				<div class="col-12 pt-4 pb-4">

					<header class="page-header">
						<h1 class="page-title text-center mt-1">Agenda</h1>
					</header>

					<div class="agenda-archive">
						<div id="archive-datepicker"></div>

						<div id="agenda" class="gs-agenda-container mt-5">
							<div class="daypicker-wrapper">
								<ul class="daypicker">
									<?php
									setlocale(LC_TIME, 'pt_BR', 'pt_BR.utf-8', 'pt_BR.utf-8', 'portuguese');
									date_default_timezone_set('America/Sao_Paulo');

									for ($i = 3; $i >= 1; $i--) {
										$date = date_create();
										date_sub($date, date_interval_create_from_date_string($i . ' days')); ?>

										<li>
											<a href="#" data-day="<?php echo date_format($date, 'Y-m-d'); ?>">
												<span><?php echo date_format($date, 'd'); ?></span>
												<small><?php echo strftime('%a', strtotime(date_format($date, 'Y-m-d'))); ?></small>
											</a>
										</li>

										<?php
									}

									for ($i = 0; $i <= 3; $i++) {
										$date = date_create();
										date_add($date, date_interval_create_from_date_string($i . ' days')); ?>

										<li <?php echo $i === 0 ? 'class="selected"' : ''; ?>>
											<a href="#" data-day="<?php echo date_format($date, 'Y-m-d'); ?>">
												<span><?php echo date_format($date, 'd'); ?></span>
												<small><?php echo strftime('%a', strtotime(date_format($date, 'Y-m-d'))); ?></small>
											</a>
										</li>

										<?php
									} ?>
								</ul>
							</div>
							<div class="entry-content">
								<div class="events">
									<?php
									$args = array(
										'post_type' => 'event',
										'tax_query' => array(
											array (
												'taxonomy' => 'event-category',
												'field' => 'slug',
												'terms' => 'agenda-cultural',
											)
										),
										'meta_query'     => array(
											'relation' => 'OR',
											array(
												'key'     => 'dados_do_evento_data-de-incio',
												'value'   => date( 'Y-m-d' ),
												'compare' => '=',
												'type'    => 'DATE'
											),
											array(
												'relation' => 'AND',
												array(
													'key'     => 'dados_do_evento_data-de-incio',
													'value'   => date( 'Y-m-d' ),
													'compare' => '<=',
													'type'    => 'DATE'
												),
												array(
													'key'     => 'dados_do_evento_data-de-fim',
													'value'   => date( 'Y-m-d' ),
													'compare' => '>=',
													'type'    => 'DATE'
												),
												array(
													'key'     => 'dados_do_evento_data-de-fim',
													'value'   => '',
													'compare' => '!='
												)
											)
										)
									);

									$query = new WP_Query($args);

									if( $query->have_posts() ):
										while ($query->have_posts()) : $query->the_post();

											$locaction = get_post_meta( get_the_ID(), 'dados_do_evento_location', true );
											$date = get_post_meta( get_the_ID(), 'dados_do_evento_data-de-incio', true );
											$raw_date = explode(' ', $date ); ?>

											<div class="event row">
												<div class="time">
													<span class="icon icon-clock"><?php echo $raw_date[1]; ?></span>
												</div>

												<div class="info">
													<?php the_title('<h2>', '</h2>'); ?>

													<div class="additional">
														<span class="location icon icon-location"><?php echo $locaction; ?></span>
														<a href="#">Adicionar ao meu calendário</a>
													</div>
												</div>

											</div>

										<?php

										endwhile; wp_reset_query();
									else: ?>

										<div class="event-item empty">
											<span class="location">Sem compromissos oficiais nesta data.</span>
										</div>

									<?php endif;
									?>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</main>

<?php
get_sidebar();
get_footer();
