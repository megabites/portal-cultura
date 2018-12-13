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

      <div id="carouselExampleFade" class="carousel slide carousel-fade" data-ride="carousel">
        <div class="carousel-inner">
          <div class="carousel-item active">
            <img class="d-block w-100" src="data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22400%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20400%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder_167a7bbb73d%20text%20%7B%20fill%3A%23555%3Bfont-weight%3Anormal%3Bfont-family%3AHelvetica%2C%20monospace%3Bfont-size%3A40pt%20%7D%20%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg%20id%3D%22holder_167a7bbb73d%22%3E%3Crect%20width%3D%22800%22%20height%3D%22400%22%20fill%3D%22%23777%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%22285.921875%22%20y%3D%22218.45%22%3EFirst%20slide%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E" alt="First slide">
          </div>


          <div class="carousel-item">
            <img class="d-block w-100" src="data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22400%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20400%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder_167a7bbb747%20text%20%7B%20fill%3A%23444%3Bfont-weight%3Anormal%3Bfont-family%3AHelvetica%2C%20monospace%3Bfont-size%3A40pt%20%7D%20%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg%20id%3D%22holder_167a7bbb747%22%3E%3Crect%20width%3D%22800%22%20height%3D%22400%22%20fill%3D%22%23666%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%22247.3203125%22%20y%3D%22218.45%22%3ESecond%20slide%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E" alt="Second slide">
          </div>
          <div class="carousel-item">
            <img class="d-block w-100" src="data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22400%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20400%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder_167a7bbb73f%20text%20%7B%20fill%3A%23333%3Bfont-weight%3Anormal%3Bfont-family%3AHelvetica%2C%20monospace%3Bfont-size%3A40pt%20%7D%20%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg%20id%3D%22holder_167a7bbb73f%22%3E%3Crect%20width%3D%22800%22%20height%3D%22400%22%20fill%3D%22%23555%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%22277%22%20y%3D%22218.45%22%3EThird%20slide%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E" alt="Third slide">
          </div>
        </div>
        <a class="carousel-control-prev" href="#carouselExampleFade" role="button" data-slide="prev">
          <span class="carousel-control-prev-icon" aria-hidden="true"></span>
          <span class="sr-only">Previous</span>
        </a>
        <a class="carousel-control-next" href="#carouselExampleFade" role="button" data-slide="next">
          <span class="carousel-control-next-icon" aria-hidden="true"></span>
          <span class="sr-only">Next</span>
        </a>
      </div>

      <div class="row">
        <div class="col-12">
          <?php while ( have_posts() ) : the_post(); ?>
            <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
              <?php
                // Post thumbnail.
                twentyfifteen_post_thumbnail();
              ?>

              <header class="entry-header">
                <?php the_title( '<h1 class="entry-title">', '</h1>' ); ?>
              </header>

              <div class="entry-content">
                <div class="row">
                  <div class="col-lg-7">
                    <h3>Sobre</h3>
                    <hr/>
                    <p>A <strong>Secretaria do Audiovisual do Ministério da Cultura (SAv/MinC)</strong>, então Secretaria para o Desenvolvimento Audiovisual, foi criada pela Lei nº 8.490, de 19 de novembro de 1992, como parte do ressurgimento do Ministério da Cultura, que, em 1990, havia sido transformado em Secretaria da Cultura, diretamente vinculada à Presidência da República.</p>

                    <p>A SAv/MinC tem como competências a formação, produção inclusiva, regionalização, difusão não-comercial, democratização do acesso e preservação dos conteúdos audiovisuais brasileiros, respeitadas as diretrizes da política nacional do cinema e do audiovisual e do Plano Nacional de Cultura.</p>
                     
                    <p>A Secretaria do Audiovisual conta com duas unidades: o Centro Técnico Audiovisual (CTAv), localizado no Rio de Janeiro, e a Cinemateca Brasileira, em São Paulo. Possui ainda como competência a fiscalização da execução das metas firmadas entre o Ministério e a Agencia Nacional do Cinema – Ancine.</p>
                     
                    <p><strong><a href="http://www.ctav.gov.br/" target="_blank">Centro Técnico Audiovisual (CTAv)</a></strong></p>
                    <p>O <strong>Centro Técnico Audiovisual (CTAv)</strong> nasceu de um acordo de cooperação técnica, assinado em 1985, entre a Embrafilme e o National Film Board (NFB), do Canadá. O CTAv é vinculado à SAv desde 2003. O Centro atua no apoio ao desenvolvimento da produção audiovisual brasileira e suas ações abrangem a produção, coprodução, difusão, preservação, documentação, pesquisa, produção de conteúdo, disseminação de técnicas do ofício, inovação e empréstimo de tecnologia.</p>

                    <p class="mb-0"><a href="http://cultura.gov.br/sav" targt="_blank" class="btn">Contatos da SAv</a>
                  </div>

                  <div class="col-sm bio">
                    <div class="wrapper" style="padding: 30px; border: 1px solid #222;">
                      <h3>Secretário</h3>
                      <hr/>

                      <img src="http://www.cultura.gov.br/documents/10883/11290/Frederico+Mascarenhas+-+Secret%C3%A1rio+de+Audiovisual.jpg/359a64ab-bba0-4775-a071-6deb1688caa9?t=1532455601985" />

                      <p>
                        <strong>Frederico Maia Mascarenhas</strong>
                        Advogado, é formado em Direito (IBMEC) e possui especializações em Direito do Entretenimento (UERJ) e em Direito do Estado e da Regulação (FGV). Atuava há mais de cinco anos como Consultor Jurídico da Riofilme. O novo secretário tem perfil técnico, vasta experiência em direito administrativo público e amplo conhecimento do setor audiovisual, tendo trabalhado na área (gestão pública relacionada ao audiovisual) nos últimos dez anos.
                      </p>

                      <p class="mb-0 text-center"><a href="http://cultura.gov.br/sav" targt="_blank" class="btn">Saiba Mais</a>
                    </div>
                  </div>
                </div>

              </div>

              <?php // edit_post_link( __( 'Edit', 'twentyfifteen' ), '<footer class="entry-footer"><span class="edit-link">', '</span></footer><!-- .entry-footer -->' ); ?>

            </article>

          <?php endwhile; ?>
        </div>
      </div>
    </div>

    <div id="conteudo-especifico" class="pt-5" style="background-color: #19224d; padding-bottom: 80px; background-image: url("data:image/svg+xml,%3Csvg width='40' height='12' viewBox='0 0 40 12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 6.172L6.172 0h5.656L0 11.828V6.172zm40 5.656L28.172 0h5.656L40 6.172v5.656zM6.172 12l12-12h3.656l12 12h-5.656L20 3.828 11.828 12H6.172zm12 0L20 10.172 21.828 12h-3.656z' fill='%23ffffff' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E");">
      <div class="container">
        <h2 class="text-center mb-4" style="color: #FFF;">Conteúdo Específico</h2>

          <div class="row">
            <div class="col">
              <div class="feature-card text-center card-1">
                <a href="http://hmg.cultura.gov.br/acesso-a-informacao/acoes-e-programas/">
                  <div class="align">
                    <div class="icon icon-acoes-programadas"></div>
                    <h3 class="card-title">Conteúdo #1</h3>
                  </div>
                </a>
              </div>
            </div>
            <div class="col">
              <div class="feature-card text-center card-1">
                <a href="http://hmg.cultura.gov.br/acesso-a-informacao/acoes-e-programas/">
                  <div class="align">
                    <div class="icon icon-acoes-programadas"></div>
                    <h3 class="card-title">Conteúdo #2</h3>
                  </div>
                </a>
              </div>
            </div>
            <div class="col">
              <div class="feature-card text-center card-1">
                <a href="http://hmg.cultura.gov.br/acesso-a-informacao/acoes-e-programas/">
                  <div class="align">
                    <div class="icon icon-acoes-programadas"></div>
                    <h3 class="card-title">Conteúdo #3</h3>
                  </div>
                </a>
              </div>
            </div>
          </div>

      </div>
    </div>

    <div class="container mb-5">
      <div class="col-12 pt-4 pb-4">
          <div id="search-content-wrapper">
            <h2>Notícias da SAv</h2>
          </div>

        <div class="row">

          <?php

          $args = array(
            'posts_per_page' => 3,
            'category_name'  => 'noticias'
          );

          $news_query = new WP_Query( $args ); ?>


<?php if ($news_query->have_posts()) : ?>
  <ul id="posts-list">

    <?php while ($news_query->have_posts()) : ?>
      <?php $news_query->the_post(); ?>

      <li id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
        <div class="categories"><?php the_category(', '); ?></div>

        <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
        <p><?php echo idg_excerpt(); ?></p>

        <?php if (get_the_tags()) : ?>
          <div class="tags-list">
            <?php the_tags('<span>tags:</span>', ''); ?>
          </div>
        <?php endif; ?>

        <span class="details">
          por <?php the_author_posts_link(); ?>
          última modificação em <?php the_modified_date('d/m/Y'); ?> <?php the_modified_time('H'); ?>
          h<?php the_modified_time('i'); ?>
        </span>
      </li>

    <?php endwhile; ?>

    <?php if ( function_exists('wp_bootstrap_pagination') ){
      wp_bootstrap_pagination();
    }; ?>


  </ul>

<?php else : ?>

  <?php get_template_part('template-parts/content', 'none'); ?>

<?php endif; ?>

        </div>
      </div>
    </div>
  </main>
<?php
get_footer();
