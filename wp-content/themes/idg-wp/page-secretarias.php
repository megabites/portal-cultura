<?php /* Template Name: Secretarias */ ?>

<?php
/**
 * The template for displaying all pages
 *
 * This is the template that displays all pages by default.
 * Please note that this is the WordPress construct of pages
 * and that other 'pages' on your WordPress site may use a
 * different template.
 *
 * @link https://developer.wordpress.org/themes/basics/template-hierarchy/
 *
 * @package Identidade_Digital_do_Governo_-_WordPress
 */

get_header();
?>

  <main id="main" class="site-main">
    <div class="container">
      <?php the_breadcrumb (); ?>

      <div class="row">
        <div class="col-12">
          <?php
          while ( have_posts() ) :
            the_post();

            get_template_part( 'template-parts/content-page', 'page' );

            // If comments are open or we have at least one comment, load up the comment template.
            if ( comments_open() || get_comments_number() ) :
              comments_template();
            endif;

          endwhile; // End of the loop.
          ?>
        </div>

        <div class="entry-content">
          <?php get_template_part('template-parts/copyright'); ?>
        </div>
      </div>

      <div id="conteudo-especifico">
        <h2>Conteúdo Específico
        <div class="row">
          <div class="col-sm-12 col-md-6 col-lg-3 mb-4">
            <div class="feature-card text-center card-3">
              <div class="align">
                <!-- <div class="icon icon-fale-conosco"></div> -->
                <h3 class="card-title">Conteudo especifico #1</h3>
                <p class="card-desc">Lorem ipsum dolor sit</p>
                <a class="card-btn btn" href="#">Acesse</a>
              </div>
            </div>
          </div>
          <div class="col-sm-12 col-md-6 col-lg-3 mb-4">
            <div class="feature-card text-center card-3">
              <div class="align">
                <!-- <div class="icon icon-fale-conosco"></div> -->
                <h3 class="card-title">Conteudo especifico #2</h3>
                <p class="card-desc">Lorem ipsum dolor sit</p>
                <a class="card-btn btn" href="#">Acesse</a>
              </div>
            </div>
          </div>
          <div class="col-sm-12 col-md-6 col-lg-3 mb-4">
            <div class="feature-card text-center card-3">
              <div class="align">
                <!-- <div class="icon icon-fale-conosco"></div> -->
                <h3 class="card-title">Conteudo especifico #3</h3>
                <p class="card-desc">Lorem ipsum dolor sit</p>
                <a class="card-btn btn" href="#">Acesse</a>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </main>
<?php
get_footer();
