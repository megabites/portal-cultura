<?php /* Template Name: Informação ao Cidadão */ ?>

<?php get_header(); ?>

  <main id="page-info" class="site-main">
    <div class="container">
      <div class="row">
        <?php the_breadcrumb (); ?>
      </div>

      <div  id="content">

        <div class="row title-wrapper">
          <div class="title text-center">
            <?php the_content(); ?>
          </div>
        </div>

        <div class="row align-items-center wrapper-box">

          <?php wp_reset_postdata(); ?>

          <?php
            $args = array(
              'post_parent' => $post->ID,
              'post_type' => 'page',
              'orderby' => 'menu_order'
            );

            $child_query = new WP_Query( $args );
          ?>

          <?php if ($child_query->have_posts()) : ?>
            <?php $i=0; while ( $child_query->have_posts() ) : $i++; $child_query->the_post(); ?>
              <div class="col">
                <div class="feature-card static-height">
                  <a href="<?php the_permalink(); ?>" class="text-center">
                    <div class="align">
                      <h3 class="card-title"><?php the_title(); ?></h3>
                    </div>
                  </a>
                </div>
              </div>

              <?php if ($i % 4 == 0) : ?>
                </div>

                <div class="row align-items-center wrapper-box">
              <?php endif; ?>
            <?php endwhile; ?>
          <?php endif; ?>
      </div>

          <div class="entry-content">
            <?php get_template_part('template-parts/copyright'); ?>
          </div>
    </div>
  </main>

<?php get_footer(); ?>


