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

					<?php

					$args = array(
						'post_type' => 'event',
						'posts_per_page' => -1
					);

					$all_events_query = new WP_Query($args);
					$event_dates = array();

					if( $all_events_query->have_posts() ):
						while ($all_events_query->have_posts()) : $all_events_query->the_post();

							$start_date = get_post_meta( get_the_ID(), 'dados_do_evento_data-de-incio', true );
							$end_date = get_post_meta( get_the_ID(), 'dados_do_evento_data-de-fim', true );
							$raw_start_date = explode(' ', $start_date );
							$raw_end_date = explode(' ', $end_date );
							array_push($event_dates, str_replace( '-', '', $raw_start_date[0]));
							array_push($event_dates, str_replace( '-', '', $raw_end_date[0]));

						endwhile;
					endif; ?>

					<div class="agenda-archive">

						<div class="event-cats-selector mb-5">
							<?php
							$event_cats = get_terms( 'event-category', array(
								'hide_empty' => 0
							) ); ?>
							<div class="input-group" style="max-width: 50%;margin: auto;">
								<select class="form-control" style="height: 50px; border-radius: 30px;">
									<?php foreach ($event_cats as $cat): ?>
										<option value="<?php echo $cat->slug; ?>"><?php echo $cat->name; ?></option>
									<?php endforeach; ?>
								</select>
							</div>
						</div>

						<div id="archive-datepicker" data-event-days='<?php echo json_encode($event_dates); ?>'></div>

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
											<a href="#" data-day="<?php echo date_format($date, 'Y-m-d'); ?>" title="<?php echo strftime('%d/%m/%Y', strtotime( date_format($date, 'Y-m-d') ) ); ?>">
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
											<a href="#" data-day="<?php echo date_format($date, 'Y-m-d'); ?>" title="<?php echo strftime('%d/%m/%Y', strtotime( date_format($date, 'Y-m-d') ) ); ?>">
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

									$this_day_events_query = new WP_Query($args);

									if( $this_day_events_query->have_posts() ):

										while ($this_day_events_query->have_posts()) : $this_day_events_query->the_post();

											$locaction = get_post_meta( get_the_ID(), 'dados_do_evento_location', true );
											$date = get_post_meta( get_the_ID(), 'dados_do_evento_data-de-incio', true );
											$raw_date = explode(' ', $date ); ?>

											<div class="event row">
												<div class="time">
													<span class="icon icon-clock"><?php echo $raw_date[1]; ?></span>
												</div>

												<div class="info">
													<h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>

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

									<?php endif; ?>
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
