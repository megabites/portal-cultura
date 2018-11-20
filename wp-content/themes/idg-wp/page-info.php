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
            <h2>Informação ao Cidadão</h2>
            <p>Acompanhe as informações sobre o funcionamento, atividades e gastos realizados pelo Ministério da Cultura.</p>
          </div>
        </div>

        <div class="row align-items-center wrapper-box">
          <div class="col">
            <div class="feature-card static-height">
              <a href="<?php echo home_url('/institucional'); ?>">
                <div class="align">
                  <h3 class="card-title">Institucional</h3>
                </div>
              </a>
            </div>
          </div>
          <div class="col">
            <div class="feature-card static-height">
              <a href="<?php echo home_url('/acoes-e-programas'); ?>">
                <div class="align">
                  <h3 class="card-title">Ações e Programas</h3>
                </div>
              </a>
            </div>
          </div>
          <div class="col">
            <div class="feature-card static-height">
              <a href="<?php echo home_url('/participacao-social'); ?>">
                <div class="align">
                  <h3 class="card-title">Participação Social</h3>
                </div>
              </a>
            </div>
          </div>
          <div class="col">
            <div class="feature-card static-height">
              <a href="<?php echo home_url('/auditorias'); ?>">
                <div class="align">
                  <h3 class="card-title">Auditorias</h3>
                </div>
              </a>
            </div>
          </div>
        </div>

        <div class="row align-items-center wrapper-box">
          <div class="col">
            <div class="feature-card static-height">
              <a href="<?php echo home_url('/convenios-e-transferencias'); ?>">
                <div class="align">
                  <h3 class="card-title">Convênios e Transferências</h3>
                </div>
              </a>
            </div>
          </div>
          <div class="col">
            <div class="feature-card static-height">
              <a href="<?php echo home_url('/receitas-e-despesas/'); ?>">
                <div class="align">
                  <h3 class="card-title">Receitas e Despesas</h3>
                </div>
              </a>
            </div>
          </div>
          <div class="col">
            <div class="feature-card static-height">
              <a href="<?php echo home_url('/licitacoes-e-contratos/'); ?>">
                <div class="align">
                  <h3 class="card-title">Licitações e Contratos</h3>
                </div>
              </a>
            </div>
          </div>
          <div class="col">
            <div class="feature-card static-height">
              <a href="<?php echo home_url('/servidores/'); ?>">
                <div class="align">
                  <h3 class="card-title">Servidores</h3>
                </div>
              </a>
            </div>
          </div>
        </div>

        <div class="row align-items-center wrapper-box">
          <div class="col">
            <div class="feature-card static-height">
              <a href="<?php echo home_url('/informacoes-classificadas/'); ?>">
                <div class="align">
                  <h3 class="card-title">Informações Classificadas</h3>
                </div>
              </a>
            </div>
          </div>
          <div class="col">
            <div class="feature-card static-height">
              <a href="<?php echo home_url('/servico-de-informacoes-ao-cidadao/'); ?>">
                <div class="align">
                  <h3 class="card-title">Serviço de Informações ao Cidadão</h3>
                </div>
              </a>
            </div>
          </div>
          <div class="col">
            <div class="feature-card static-height">
              <a href="<?php echo home_url('/perguntas-frequentes/'); ?>">
                <div class="align">
                  <h3 class="card-title">Perguntas Frequentes</h3>
                </div>
              </a>
            </div>
          </div>
          <div class="col">
            <div class="feature-card static-height">
              <a href="<?php echo home_url('/dados-abertos/'); ?>">
                <div class="align">
                  <h3 class="card-title">Dados Abertos</h3>
                </div>
              </a>
            </div>
          </div>
        </div>

      </div>

          <div class="entry-content">
            <?php get_template_part('template-parts/copyright'); ?>
          </div>
    </div>
  </main>

<?php get_footer(); ?>


